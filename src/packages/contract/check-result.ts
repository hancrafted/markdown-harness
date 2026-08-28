/**
 * `--check`: every governed file with a fault, and the headline counts.
 *
 * THE DATA CARRIES NO PROSE OF OURS. A violation code, the value found, and the
 * config fragment that failed are a complete basis for every sentence the tool
 * could say, so a stored `message` would hold one fact twice and two
 * representations of one fact drift.
 *
 * Author prose does appear, and that is a different thing: a rule's `intent` and
 * a field's `intent` are the Operator's own words, quoted verbatim, and quoting
 * them is the point. What is absent is any sentence WE wrote.
 *
 * Two things this result no longer carries, both removed on the same argument.
 *
 * NO `format` VERSION. It was `'v1'`, one member, and it bought a stored artifact
 * the ability to say which shape it was. Nothing stores a report — port
 * verification compares two implementations running the same version at the same
 * moment, never one artifact against another across time — so it was paying for
 * a case that does not exist. It is free to reintroduce the day something does
 * store one, and that day is the condition, not a hunch.
 *
 * NO MODULE KEY. Violations used to sit under `violations: { frontmatter: [...] }`
 * so that a second Module could add its own without moving the existing ones in
 * every stored report. That argument dies with the same premise: if nothing
 * stores a report, nothing has to be kept from moving inside one. The nesting
 * was a level of indirection charged to every file today against a Module that
 * does not exist yet, and `architecture.md` keeps that Module's shape open
 * rather than pending. When it lands, a `module` field on a violation is the
 * cheaper answer than a key wrapping every list.
 */

import type { RepoPath } from './corpus.ts';
import type { Violation } from './violation.ts';

export interface CheckResult {
  summary: CheckSummary;
  /**
   * One entry per governed file WITH A FAULT. A conforming governed file is
   * absent, and an ungoverned file is absent for a different and stronger
   * reason: tenet 6 says it is never reported.
   */
  files: readonly FileFaults[];
}

/**
 * The three counts, all stored, including the two that are arithmetic.
 *
 * `faultyFiles` is `files.length` and `totalViolations` is the sum over them, so
 * an earlier version of this contract stored neither — arithmetic on a report is
 * the CONSUMER's job, by the same rule that keeps a `message` out of a
 * violation. That rule was right about prose and wrong here, because the
 * consumer is an agent: asking a language model to sum an array to find out
 * whether anything is wrong is asking the one thing it is least reliable at.
 * Both are computed from `files` at the point of return, so the three cannot
 * disagree.
 *
 * There is deliberately no `invisible` count. Tenet 6 says an ungoverned file is
 * never counted, and a field holding that number would be the report noticing
 * the file.
 */
export interface CheckSummary {
  /** Files at least one rule governs — the only count not recoverable from `files`. */
  governedFiles: number;
  /** Governed files with at least one violation. */
  faultyFiles: number;
  /** Violations across every faulty file. */
  totalViolations: number;
}

/**
 * One governed file with a fault.
 *
 * `ruleId` and `ruleIntent` sit HERE, flat, not on each violation. Under first
 * match every violation in a file comes from the same rule, so hoisting them
 * makes a merged report unrepresentable rather than merely wrong.
 *
 * The rule's `selector` is NOT here. Which glob matched is the Operator's
 * question while debugging a config, and `--coverage` answers it for every rule
 * at once; a Contributor's agent repairing this file can act on none of it.
 */
export interface FileFaults {
  path: RepoPath;
  ruleId: string;
  /** The winning rule's `intent`, verbatim. A field constraint carrying its own overrides it, inside `requirement`. */
  ruleIntent: string;
  violations: readonly Violation[];
}
