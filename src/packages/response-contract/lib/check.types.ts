/**
 * What `--check` answers about one corpus.
 *
 * The only command that opens a file, and the only one that can exit 1. Its
 * reader is the Contributor's agent, which is why none of `--audit`'s
 * rule-level diagnostics ride along here: an agent about to edit a document can
 * act on none of it.
 */

import type { SegmentViolation } from './file-name-violation.types.ts';
import type { Violation } from './violation.types.ts';

/** Every governed file that has something wrong with it, and the counts over them. */
export interface CheckResult {
  /** The arithmetic, stored so a consumer never has to sum an array to find out. */
  summary: CheckSummary;
  /**
   * One entry per governed file that has at least one violation, in walker order.
   *
   * Conforming files are absent; invisible files are absent for the stronger
   * reason that nothing ever read them.
   */
  files: readonly FileViolations[];
}

/**
 * The three counts, computed at the point of return so they cannot disagree.
 *
 * The consumer is an agent, and asking a language model to sum an array to find
 * out whether anything is wrong is asking the one thing it is least reliable at.
 *
 * There is deliberately no `invisible` count — a field holding it would be the
 * report noticing files it promised never to notice.
 */
export interface CheckSummary {
  /**
   * Files at least one rule of at least one Module governs — the UNION, and the
   * only count not recoverable from `files`.
   *
   * One number rather than one per Module, and the reason is what the number is
   * for: it is the denominator a Contributor's agent reads to know how much of
   * the corpus was looked at. Per-Module coverage is a question about the
   * config rather than about the documents, and it stays `--audit`'s business.
   */
  governedFiles: number;
  /** Governed files carrying at least one violation, in any Module. Always `=== files.length`. */
  invalidFiles: number;
  /** Sum of every Module's `violations.length` across `files`. */
  totalViolations: number;
}

/**
 * One file's findings, grouped by the Module that found them.
 *
 * ONE ENTRY PER FILE STILL. The Module dimension nests one level down rather
 * than sectioning the envelope, because the consumer's question is "what is
 * wrong with this file" and an envelope split by Module would make them join
 * two lists to answer it.
 *
 * `ruleId` and `ruleIntent` moved DOWN here from the file, and the docblock
 * that justified them being singular is relocated rather than repealed: under
 * first-match every violation in a file comes from the same rule — WITHIN ONE
 * MODULE. Across Modules it is measurably false, since a file can have a
 * winning `frontmatter` rule and a winning `file-names` rule at once, and the
 * old shape had nowhere to put the second.
 */
export interface FileViolations {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /**
   * Every Module that found something, in the order `MarkdownHarnessConfig`
   * declares its keys — never the order the YAML mapping happened to use.
   *
   * `--check` lists only Modules WITH FINDINGS; a Module that governed the file
   * and was satisfied is absent, the same way a conforming file is absent from
   * `files`. `--query` is the command that lists every governing Module,
   * because that is the question it answers.
   */
  modules: readonly ModuleFindings[];
}

/**
 * One Module's findings for one file.
 *
 * Discriminated on `module` so the violation union is narrowed by it: a
 * consumer that has read `module: 'file-names'` knows without a second check
 * that every code it will see carries the `FILE_NAMES__` prefix.
 */
export type ModuleFindings = FrontmatterFindings | FileNameFindings;

/** What the `frontmatter` Module found. */
export interface FrontmatterFindings {
  /**
   * The Module's own CONFIG KEY, never its Package name.
   *
   * `frontmatter`, not `frontmatter-harness`. The config key is the word an
   * Operator already wrote and can grep for; the Package name is an
   * implementation detail this contract has no business exposing.
   */
  module: 'frontmatter';
  /** The rule that won this file under first-match, within this Module. */
  ruleId: string;
  /** That rule's `intent`, verbatim — the instruction every fix here is made against. */
  ruleIntent: string;
  /** Everything wrong with this file's frontmatter. */
  violations: readonly Violation[];
}

/** What the `file-names` Module found. */
export interface FileNameFindings {
  /** The Module's own config key. */
  module: 'file-names';
  /** The rule that won this file under first-match, within this Module. */
  ruleId: string;
  /** That rule's `intent`, verbatim. */
  ruleIntent: string;
  /** Everything wrong with this file's name. */
  violations: readonly SegmentViolation[];
}
