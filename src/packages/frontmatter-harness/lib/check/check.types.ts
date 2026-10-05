/**
 * The seams inside `check`.
 *
 * Each shape below names one thing the stage before it could not decide.
 * Frontmatter arrives as bytes, becomes a block, becomes data, and only then
 * can a constraint be asked anything — and every one of those steps has a
 * failure that must stay distinguishable from the others, because
 * `frontmatter: forbidden` and a constraining payload disagree about what a
 * broken block means.
 */

import type { Frontmatter, Unreadable } from '../../../foundation/read-corpus.ts';
import type { ModuleCheck } from '../../../response-contract/index.ts';
import type { FrontmatterRule } from '../../section.ts';
import type { FrontmatterViolation } from './violation.types.ts';

/** A YAML mapping, before any key of it has been read. */
export type FrontmatterMapping = Record<string, unknown>;

/** One concrete address, and what the file has at it. */
export interface AddressSite {
  /** The address as it will be reported, with any list index filled in. */
  field: string;
  /**
   * Whether the address named anything at all.
   *
   * A written-but-empty key is PRESENT: `description:` with nothing after it
   * names `null`, which is a different mistake from never writing the key and
   * earns a different code.
   */
  present: boolean;
  /** What sits there. Meaningless unless `present`. */
  value: unknown;
}

/**
 * Every concrete address one written address reaches.
 *
 * `vacuous` and `shape-mismatch` are the two ways a container can stop an
 * address short, and they are opposite findings. A constraint over the entries
 * of an ABSENT list is a claim about no entries and therefore true; the same
 * constraint over a list that is really a string is a question the data cannot
 * answer, and reporting nothing there would be a false negative.
 */
export type AddressResolution =
  /** The container is absent, so a per-entry constraint has nothing to speak about. */
  | { kind: 'vacuous' }
  /** The container is present and the wrong shape for this address. */
  | { kind: 'shape-mismatch' }
  /** The addresses this one reached, in the file's own order. */
  | { kind: 'sites'; sites: readonly AddressSite[] };

/** One corpus file, paired with the rule that won it under first-match. */
export interface GovernedFile {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** The rule that won. */
  rule: FrontmatterRule;
}

/** A governed file read and parsed, ready for a verdict. */
export interface GovernedSource {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** The rule that won. */
  rule: FrontmatterRule;
  /** The file's frontmatter, parsed once by the Core. */
  frontmatter: Frontmatter;
}

/**
 * The outcome of checking one corpus.
 *
 * The Core's `CorpusRead` one tier up: the same refusal, passed through unchanged,
 * now carrying this Module's answer instead of bytes. Its answer rather than
 * the response: the report nests a file's findings under every Module that made
 * one, and only the composing Package sees them all.
 */
export type CorpusCheck =
  /** Every governed file was read and judged. */
  { kind: 'checked'; result: ModuleCheck<FrontmatterViolation> } | Unreadable;
