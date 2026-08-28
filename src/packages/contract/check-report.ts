/**
 * The report format — the other half of the portable artifact (tenet 4).
 *
 * Frozen at `format: 'v1'`. The DATA CARRIES NO PROSE OF OURS. A constraint key,
 * the evidence, and the config fragment that failed are a complete basis for
 * every sentence the tool can say, so a stored `message` would hold one fact
 * twice and two representations of one fact drift.
 *
 * Author prose does appear, and that is a different thing: a rule's `intent` and
 * a field's `intent` are the Operator's own words, quoted verbatim, and quoting
 * them is the point. What is absent is any sentence WE wrote.
 *
 * There is no wording layer anywhere to keep in step with the data, because
 * there is no wording. The report leaves as JSON and nothing else, so a second
 * serialisation could be added later without a sentence of ours having to be
 * kept true in two places.
 */

import type { RepoPath } from './corpus.ts';
import type { ReportFormat } from './format.ts';
import type { RuleRef } from './values.ts';
import type { Violation } from './violation.ts';

export interface CheckReport {
  report: 'check';
  /** The report format version. A reader that does not know this name must not guess. */
  format: ReportFormat;
  /** Echoed back as the caller passed it — never resolved to an absolute path, so a frozen report travels. */
  root: string;
  /**
   * One entry per governed file WITH A FAULT. A conforming governed file is
   * absent, and an ungoverned file is absent for a different and stronger
   * reason: tenet 6 says it is never reported.
   */
  files: readonly FileReport[];
  /** One entry per rule, in config order — including the rules that governed nothing. */
  coverage: readonly RuleCoverage[];
  totals: CheckTotals;
}

/**
 * How one rule fared across the whole corpus.
 *
 * The stated cost of first match (tenet 5) is that EVERY LOSING RULE IS SILENT.
 * A rule that wins no file reports nothing, so an ordering mistake or a typo in
 * a glob is invisible forever — and invisible in exactly the direction a trust
 * tool cannot afford, since the missing output looks identical to a clean one.
 * This is the single diagnostic that design most needs, and the only one that
 * costs a full files x rules match matrix rather than falling out of the walk.
 *
 * Keyed by `ruleId`, which is what makes it useful: before rules were named,
 * "your rule was shadowed" could only point at a position that moves.
 */
export interface RuleCoverage {
  rule: RuleRef;
  /** Files this rule governs: it selected them, and no rule above it had already. */
  won: number;
  /** Files it selected that a rule ABOVE it had already taken. */
  shadowed: number;
  /**
   * The rules that took them, by `ruleId`, deduped, in config order.
   *
   * Always present, `[]` when nothing shadowed: an optional field would give
   * one fact two shapes and every consumer would handle both forever.
   *
   * This is the field that could not exist before rules were named. "Something
   * above you won" is not actionable; "`index-files` won" is, and it stays true
   * next week when a rule is inserted above both of them.
   */
  shadowedBy: readonly string[];
  /** Files it selected that its OWN `excludeFiles` removed before it could win. */
  excluded: number;
}

/**
 * Only `governed` is stored, because only `governed` is not derivable.
 *
 * `conforming` is `governed - files.length` and the violation count is the sum
 * over `files`. Both are arithmetic, and arithmetic on a report is the
 * CONSUMER's job — the same reason no `message` field exists. There is
 * deliberately no `invisible` count either: tenet 6 says an ungoverned file is
 * never counted, and a field holding that number would be the report noticing
 * the file.
 */
export interface CheckTotals {
  /**
   * A KNOWN REDUNDANCY, recorded rather than discovered later: this is now the
   * sum of `coverage[].won`, so by the rule above it could go.
   *
   * It stays because it is the headline count, and reading it should not
   * require knowing that a rule list exists. It is computed FROM `coverage`
   * rather than counted a second time, so the two cannot disagree — the drift
   * argument that removed `conforming` does not reach it. Dropping it is a
   * `'v2'` change and nothing else moves; `'v1'` is unshipped, so it
   * is still free.
   */
  governed: number;
}

/**
 * One governed file with a fault.
 *
 * `rule` sits HERE, not on each violation. Under first match every violation in
 * a file comes from the same rule, so hoisting it makes a merged report
 * unrepresentable rather than merely wrong.
 *
 * `violations` is keyed by MODULE. `frontmatter-harness` is the only Module
 * today, and `architecture.md` lists the second Module's shape as deliberately
 * open rather than hypothetical — so the key is here from the start, because
 * adding one later would move every violation in every stored report.
 *
 * Recorded, since it is a bounded cost taken deliberately: a Module owns its own
 * config section and therefore its own rule list, and resolves first-match
 * INDEPENDENTLY. So one file can be governed by `frontmatter`'s rule and by
 * Module 2's rule at the same time, and when that happens `rule` has to move
 * inside the module key beside its violations. That is a `format: 2` change.
 * Nothing else moves, because `violations` is already keyed.
 */
export interface FileReport {
  path: RepoPath;
  rule: RuleRef;
  violations: ModuleViolations;
}

/**
 * Violations by Module.
 *
 * `unparseable-frontmatter` has no home here yet, on purpose: no fixture file
 * produces it, so designing its shape now would be speculation. It is one of
 * the eleven clauses `core/tests/check.test.ts` names as uncovered, and it gets
 * a shape in the same change as its fixture.
 */
export interface ModuleViolations {
  frontmatter: readonly Violation[];
}
