import type { FieldAddress } from './constraints.types.ts';
import type { FileName, Selector } from './selector.types.ts';

/**
 * Which files a claim is about: one Selector, minus a list of extents.
 *
 * RECURSIVE rather than a flat list of Selectors, because first-match subtracts
 * what an earlier site WON — its own selector minus its own exclusions — and a
 * file the earlier site excluded falls THROUGH. Flat, the extent over-subtracts
 * and the check goes quiet exactly where it should speak.
 */
export interface ClaimExtent {
  include: Selector;
  exclude: readonly ClaimExtent[];
}

export interface NamedSelector extends Selector {
  fileNames: readonly [FileName, ...(readonly FileName[])];
}

export interface NamedExtent extends ClaimExtent {
  include: NamedSelector;
}

export type NameSegment = string;

export interface NameGrammar {
  pattern: string;
}

export interface ClaimSite {
  /** The config's own notation, e.g. `frontmatter.rules[0].frontmatter`. */
  at: string;
  /** What the site is called in its own Module's language, when it has a name. */
  label?: string;
  /** The files this claim is about, AFTER the Module's own resolution. */
  extent: ClaimExtent;
}

/** The first segment of a FieldAddress — `generated`, never `generated.by`. */
export type TopLevelKey = string;

export type Claim =
  | (ClaimSite & { kind: 'frontmatter-block'; stance: 'requires' | 'forbids' })
  | (ClaimSite & { kind: 'field'; stance: 'requires' | 'reads' | 'forbids'; field: FieldAddress })
  | (ClaimSite & { kind: 'field-closure'; stance: 'forbids'; named: readonly TopLevelKey[] })
  | (ClaimSite & {
      kind: 'field-cardinality';
      stance: 'requires';
      fields: readonly FieldAddress[];
      atLeast: number;
      atMost?: number;
    })
  | (ClaimSite & { kind: 'file-exists'; stance: 'requires'; extent: NamedExtent })
  | (ClaimSite & { kind: 'name-shape'; stance: 'requires'; grammar: NameGrammar });

/** The reported catalog is DERIVED from the port vocabulary, never restated beside it. */
export type ClaimKind = Claim['kind'];
export type ClaimStance = Claim['stance'];
