import type { Claim } from './claim.types.ts';
import type { ConfigFault } from './fault.types.ts';

export interface SectionValidation<TSection> {
  /** The section, typed, and ABSENT whenever any fault was found. */
  section?: TSection;
  faults: readonly ConfigFault[];
}

/**
 * What a Module offers Core, and the whole of it.
 *
 * Both members are METHODS, not properties: method syntax is bivariant in
 * TypeScript even under `strict`, and `cli` holds one array of descriptors over
 * different section types. Property syntax does not compile — measured, twice.
 */
export interface ModuleDescriptor<TSection = unknown> {
  /** This Module's one top-level config key. */
  key: string;
  /** Pass 1 — the Module's own language. */
  validateSection(raw: unknown): SectionValidation<TSection>;
  /** Pass 2 — the shared vocabulary. */
  claimsFor(section: TSection): readonly Claim[];
}
