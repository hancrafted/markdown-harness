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
import type { FrontmatterFindings } from '../../../response-contract/index.ts';

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
 * The first governed path that would not open, exactly as the read addressed it.
 *
 * Shared by both tiers below rather than spelled twice, so the refusal a read
 * produces and the refusal a caller receives cannot drift into two shapes.
 *
 * Only the FIRST. Reading on to collect every unopenable path would name more
 * files at the cost of a report that is refused either way, and one path is
 * already enough to act on.
 */
export interface UnreadableGovernedFile {
  kind: 'unreadable';
  /** The path the read was attempted at — the corpus root as written, joined to the file's own. */
  path: string;
}

/**
 * The outcome of opening every governed file.
 *
 * A tagged union and not an optional field beside a sentinel, which is what
 * `config-loader`'s stages use: those pair an optional value with a fault LIST,
 * where empty is a real count and carries no second meaning. There is no
 * equivalent here — a path is one string or no string, and `''` would be a
 * value nobody reads standing in for a state nobody can test. The two unions
 * already in this file, `FrontmatterData` and `AddressResolution`, are the
 * closer precedent, and they tag.
 */
export type GovernedRead =
  /** Every governed file, with its bytes. */
  { kind: 'read'; sources: readonly GovernedSource[] } | UnreadableGovernedFile;

/**
 * One governed file and what this Module found in it.
 *
 * Carries the findings block even when `violations` is EMPTY, and that is the
 * whole reason this type exists rather than the Module returning a finished
 * `CheckResult`. A conforming governed file is invisible in a report and
 * load-bearing in a count: `summary.governedFiles` is the union across Modules,
 * so the composer needs to know this Module reached the file even though it had
 * nothing to say about it. Handing back only the failures would make a clean
 * file and an unclaimed file indistinguishable one tier up.
 */
export interface FrontmatterOutcome {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** This Module's block for the file: its winning rule, and its findings. */
  findings: FrontmatterFindings;
}

/**
 * The outcome of checking one corpus, for THIS MODULE ALONE.
 *
 * `GovernedRead` one tier up: the same refusal, passed through unchanged, now
 * carrying verdicts instead of bytes.
 *
 * It stops at outcomes rather than assembling a `CheckResult`, because a
 * `CheckResult` is a claim about every Module at once — its `summary` counts
 * the union and its `files` merge Modules per path. A Module that built one
 * would be answering for a Module it cannot see.
 */
export type FrontmatterCorpusCheck =
  /** Every governed file read and judged. */
  { kind: 'checked'; outcomes: readonly FrontmatterOutcome[] } | UnreadableGovernedFile;
