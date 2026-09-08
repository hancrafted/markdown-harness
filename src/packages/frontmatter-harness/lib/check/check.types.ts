/**
 * The seams inside `--check`.
 *
 * Each shape below names one thing the stage before it could not decide.
 * Frontmatter arrives as bytes, becomes a block, becomes data, and only then
 * can a constraint be asked anything — and every one of those steps has a
 * failure that must stay distinguishable from the others, because
 * `frontmatter: forbidden` and a constraining payload disagree about what a
 * broken block means.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { CheckResult } from '../../../response-contract/index.ts';

/** A YAML mapping, before any key of it has been read. */
export type FrontmatterMapping = Record<string, unknown>;

/**
 * How far a file's frontmatter got.
 *
 * `absent` and `unparseable` are deliberately not one state. Under a
 * constraining rule `absent` reads as an empty mapping, which is what lets
 * `presence: required` fire on a file that never opened a block, while
 * `unparseable` is reported alone. Under `frontmatter: forbidden` the two
 * invert: `absent` is the only one that passes.
 */
export type FrontmatterData =
  /** No fence at all. Reads as `{}` under a constraining rule. */
  | { kind: 'absent' }
  /** The block exists and will not parse, or parsed to a scalar or a list. */
  | { kind: 'unparseable' }
  /** The block parsed to a mapping, possibly an empty one. */
  | { kind: 'mapping'; data: FrontmatterMapping };

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

/** A governed file with its bytes read, ready for a verdict. */
export interface GovernedSource {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** The rule that won. */
  rule: FrontmatterRule;
  /** The file's full contents. */
  text: string;
}

/**
 * The outcome of opening every governed file.
 *
 * Shaped like `config-loader`'s stages — the value is optional and the failure
 * is always there — rather than as a tagged union, because that is what every
 * other outcome in this codebase looks like and one shape is easier to read
 * than two. Empty means nothing was refused, the same way `Termination.stdout`
 * spells "write nothing".
 *
 * The path travels because the caller's only channel is a sentence for a human.
 * A bare absence would let it say that something failed and nothing else, and
 * `--check` already dropped the platform's own message on the floor.
 */
export interface GovernedRead {
  /** Every governed file with its bytes, absent when one of them would not open. */
  sources?: readonly GovernedSource[];
  /** The path that would not open, exactly as the read addressed it; empty when all of them did. */
  unreadable: string;
}

/**
 * The outcome of checking one corpus.
 *
 * `GovernedRead` one tier up: the same refusal, now carrying a verdict instead
 * of bytes. The two are separate shapes rather than one generic because
 * `sources` is an internal seam and `result` is what a caller receives.
 */
export interface CorpusCheck {
  /** The verdict, absent when a governed file would not open. */
  result?: CheckResult;
  /** The path that would not open, exactly as the read addressed it; empty when all of them did. */
  unreadable: string;
}
