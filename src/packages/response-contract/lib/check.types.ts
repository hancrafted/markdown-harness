/**
 * What `--check` answers about one corpus, and what one Module contributes to
 * that answer.
 *
 * The only command that opens a file, and the only one that can exit 1. Its
 * reader is the Contributor's agent, which is why none of `--audit`'s
 * rule-level diagnostics ride along here: an agent about to edit a document can
 * act on none of it.
 *
 * A file's findings nest one level down, under the Module that made them. The
 * nesting is not decoration: two Modules can each have something to say about
 * one file, and a flat list would leave a reader joining two claims by path
 * with nothing to say which section of the config to open. `ModuleCheck` and
 * `ModuleFinding` are the other half of that shape — what ONE Module hands back
 * before anything nests it. They are named here rather than in a Module because
 * every Module answers in the same shape, and a per-Module spelling of it is how
 * two Modules end up contributing two different things.
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
  /**
   * Files at least one Module governs — the only count not recoverable from `files`.
   *
   * A UNION rather than a sum: a file two Modules both govern is one governed
   * file, and adding the Modules' own tallies would count it twice.
   */
  governedFiles: number;
  /** Governed files carrying at least one violation. Always `=== files.length`. */
  invalidFiles: number;
  /** Sum of `violations.length` across every Module block of every file. */
  totalViolations: number;
}

/**
 * One file's findings, gathered from every Module that had one.
 *
 * Only the Modules that found something appear. This command's reader is an
 * agent about to edit the document, and a Module block saying nothing is wrong
 * is not something it can act on — the steering command is where every
 * governing Module is listed whether or not it is complaining.
 */
export interface FileViolations {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** One block per Module with a finding here, in declared Module order. */
  modules: readonly ModuleViolations[];
}

/**
 * What one rule found in one file.
 *
 * `ruleId` and `ruleIntent` sit here rather than on each violation because
 * under first-match every violation comes from the same rule. That justification
 * is not repealed by the nesting, it is RELOCATED: it holds within one Module,
 * which is exactly the level this block sits at.
 */
export interface RuleFindings {
  /** The rule that won this file under first-match (§3.1). */
  ruleId: string;
  /** That rule's `intent`, verbatim — the instruction every fix here is made against (§3.4). */
  ruleIntent: string;
  /** Everything this rule found wrong, in the order §4.6 fixes. */
  violations: readonly Violation[];
}

/** One Module's findings about one file, named by the Module that made them. */
export interface ModuleViolations extends RuleFindings {
  /**
   * The top-level config key the Operator typed.
   *
   * Never a Package name and never a short name minted for the report: the
   * point of naming the Module is to tell the reader which section of their own
   * config to open, and only the key they wrote does that. It is read from the
   * Module's descriptor at composition, so a Module cannot spell its own name
   * into a report and have it drift from the key that reaches the config.
   */
  module: string;
}

/**
 * One Module's answer about one corpus, before composition nests it.
 *
 * Both halves are needed and neither is recoverable from the other: the
 * findings say what is wrong, and `governed` says which files were looked at —
 * which is what the union behind `governedFiles` is taken over.
 */
export interface ModuleCheck {
  /** Every path this Module governs, in walker order, whether or not it found anything. */
  governed: readonly string[];
  /** One entry per governed file this Module found something wrong with, in walker order. */
  files: readonly ModuleFinding[];
}

/** One Module's findings about one file, before composition names the Module. */
export interface ModuleFinding extends RuleFindings {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
}
