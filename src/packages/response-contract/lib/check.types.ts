/**
 * What `--check` answers about one corpus.
 *
 * The only command that opens a file, and the only one that can exit 1. Its
 * reader is the Contributor's agent, which is why none of `--audit`'s
 * rule-level diagnostics ride along here: an agent about to edit a document can
 * act on none of it.
 */

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
  /** Files at least one rule governs — the only count not recoverable from `files`. */
  governedFiles: number;
  /** Governed files carrying at least one violation. Always `=== files.length`. */
  invalidFiles: number;
  /** Sum of `violations.length` across `files`. */
  totalViolations: number;
}

/**
 * One file's findings.
 *
 * `ruleId` and `ruleIntent` sit on the file rather than on each violation:
 * under first-match, every violation in a file comes from the same rule.
 */
export interface FileViolations {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** The rule that won this file under first-match (§3.1). */
  ruleId: string;
  /** That rule's `intent`, verbatim — the instruction every fix here is made against (§3.4). */
  ruleIntent: string;
  /** Everything wrong with this file, in the order §4.6 fixes. */
  violations: readonly Violation[];
}
