/**
 * The report format — the other half of the portable artifact (tenet 4).
 *
 * Frozen at `format: 1`. The DATA CARRIES NO PROSE OF OURS. A constraint key,
 * the evidence, and the config fragment that failed are a complete basis for
 * every sentence the tool can say, so a stored `message` would hold one fact
 * twice and two representations of one fact drift.
 *
 * Author prose does appear, and that is a different thing: a rule's `intent` and
 * a field's `intent` are the Operator's own words, quoted verbatim, and quoting
 * them is the point. What is absent is any sentence WE wrote.
 *
 * The renderer serialises this back to YAML and adds nothing, so there is no
 * wording layer left to keep in step with the data — which is what makes the
 * report the same artifact whether an agent reads it as JSON or a human reads it
 * as text.
 */

import type { RepoPath } from './corpus.ts';
import type { RuleRef } from './values.ts';
import type { Violation } from './violation.ts';

export interface CheckReport {
  report: 'check';
  /** The report format version. A reader that does not know this number must not guess. */
  format: 1;
  /** Echoed back as the caller passed it — never resolved to an absolute path, so a frozen report travels. */
  root: string;
  /**
   * One entry per governed file WITH A FAULT. A conforming governed file is
   * absent, and an ungoverned file is absent for a different and stronger
   * reason: tenet 6 says it is never reported.
   */
  files: readonly FileReport[];
  totals: CheckTotals;
}

/**
 * Only `governed` is stored, because only `governed` is not derivable.
 *
 * `conforming` is `governed - files.length` and the violation count is the sum
 * over `files`. Both are arithmetic, and arithmetic on a report is the
 * renderer's job — the same reason no `message` field exists. There is
 * deliberately no `invisible` count either: tenet 6 says an ungoverned file is
 * never counted, and a field holding that number would be the report noticing
 * the file.
 */
export interface CheckTotals {
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
