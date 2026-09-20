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
  /** Sum of violations across files. */
  totalViolations: number;
}

/**
 * One module's findings on a file.
 */
export interface ModuleViolations {
  /** The config key the Operator typed, never the Package name. */
  module: string;
  /** The rule that won this file under first-match within this Module. */
  ruleId: string;
  /** That rule's intent verbatim. */
  ruleIntent: string;
  /** Everything wrong with this file from this module. */
  violations: readonly Violation[];
}

/**
 * One file's findings, grouped by Module.
 */
export interface FileViolations {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** Findings grouped by the Module that made them. */
  modules: readonly ModuleViolations[];
}
