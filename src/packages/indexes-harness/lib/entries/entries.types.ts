/**
 * What one line of the generated list is made of, before it is a line.
 *
 * Membership is DECLARED, never discovered. An entry exists because the config
 * named the directory holding it; a sibling in an undeclared directory does not
 * appear at all, and no finding is keyed to it either. We cannot know how an
 * adopter's folder structure reflects their need for progressive disclosure, so
 * an index is what a folder PUBLISHES — and publishing is a decision rather
 * than a mirror of the filesystem.
 *
 * Name-only is the forgiveness path, not a way in: it is what a DECLARED entry
 * degrades to when its description is absent.
 */

import type { IndexesConfig } from '../../../config-contract/index.ts';

/**
 * Everything resolving one directory's list needs, and nothing it does not.
 *
 * A bundle rather than four parameters, and the shape is the better one
 * independently of the limit that forced it: these four always travel together,
 * they are constant across every directory in a run, and only `directory`
 * varies. Passing them separately made every signature in the Module restate
 * the same four names.
 *
 * Note what is NOT in it: a filesystem. The matcher and the sources both arrive
 * as arguments, which is what lets the whole planner be exercised without one.
 */
export interface ListingContext {
  /** The `indexes:` section. */
  config: IndexesConfig;
  /** The corpus, as root-relative paths. */
  files: readonly string[];
  /** Every corpus file's contents, keyed by path. Absent means unreadable or non-existent. */
  sources: Readonly<Record<string, string>>;
  /** Whether a glob selects a path. Injected so resolution stays deterministic. */
  matches: (glob: string, path: string) => boolean;
}

/** The three fields an entry may be built out of, read from frontmatter and nothing else. */
export interface DescriptorFields {
  /** Frontmatter `title`. First rung of the link-text chain. */
  title?: string;
  /** Frontmatter `name`. Second rung — 45 of 45 `SKILL.md` files carry it and 0 carry a title. */
  name?: string;
  /** Frontmatter `description`. Absent means the entry degrades to name-only. */
  description?: string;
}

/** One entry, resolved but not yet rendered. */
export interface IndexEntry {
  /**
   * The link text.
   *
   * For a file: frontmatter `title`, then `name`, then the file name without
   * `.md`. The H1 is deliberately NOT a fallback — reading the body would make
   * this a body-reading Module, and body maintenance is out of scope.
   *
   * For a folder: the folder name, always. Only the description is read from
   * frontmatter there.
   */
  text: string;

  /**
   * The link target, relative to the index file's own directory.
   *
   * A folder entry ALWAYS targets the child's `index.md`, never the child's
   * descriptor. Linking the descriptor would send a reader following a table of
   * contents into a file of agent instructions; `index.md` is the
   * progressive-disclosure container.
   */
  target: string;

  /** Copied byte for byte out of the parsed frontmatter. Absent is name-only. */
  description?: string;

  /**
   * What this entry sorts on: the file name INCLUDING `.md`, or the folder name.
   *
   * Because the list is flat, folder and file entries interleave by name —
   * `parts` sits between `okf-conformance.md` and `pathrule-precedence.md`.
   */
  sortKey: string;
}

/**
 * Why one entry cannot be copied, and therefore why a whole directory is refused.
 *
 * Refusal over repair, on three grounds. The precedent this map named is
 * terraform-docs, which hard-fails when its own input does not parse. The
 * config contract already refuses substitution one level down — an `intent` is
 * never replaced by the harness's own sentence. And strictness is the
 * reversible direction: a refusal can be relaxed later without touching an
 * adopter's tree, while an escape shipped now becomes bytes a later tightening
 * would have to rewrite.
 */
export type EntryRefusal =
  /** A `|` literal block parses to a string carrying `\n`, and an entry is one line. */
  | 'ENTRY_TEXT_HOLDS_LINE_BREAK'
  /** `[Rules ]draft](rules.md)` ends the link early and leaks the rest as prose. */
  | 'ENTRY_TEXT_HOLDS_UNBALANCED_BRACKET'
  /**
   * The text holds one of the region's own boundary literals.
   *
   * BOTH markers, not only the end one. The ground is not that this finder
   * could be confused — it cannot, because a marker inside a description is
   * inline HTML. It is that the boundary bytes must be unique within the region
   * as a property of the ARTIFACT: the region is a portable contract, so "the
   * marker appears exactly once" is an invariant any consumer may rely on,
   * including a byte-scanning one that is not this generator.
   */
  | 'ENTRY_TEXT_HOLDS_REGION_MARKER';

/** Everything one declared directory publishes, or the reason it publishes nothing. */
export interface DirectoryListing {
  /** One rendered list item per entry, already in order. Empty when refused. */
  entries: readonly string[];
  /** Whether `excludeFiles` is in effect, which is what puts the disclosure comment in the region. */
  disclosed: boolean;
  /** Why nothing may be written for this directory, absent when it may. */
  refusal?: EntryRefusal;
  /** The path whose text caused the refusal, so the Operator has somewhere to go. */
  refusedAt?: string;
}
