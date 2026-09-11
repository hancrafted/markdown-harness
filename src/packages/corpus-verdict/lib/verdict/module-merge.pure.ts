/**
 * One report out of several Modules' answers.
 *
 * This is the only place that knows a corpus has more than one Module looking
 * at it, and it is deliberately the only place. Each Module answers for itself
 * and cannot see its sibling; the arithmetic that spans them — which files were
 * governed by ANYONE, how many findings there are in total — has to be done
 * where both answers are in hand, or it would be a Module stating a number
 * about a corpus it only half looked at.
 */

import { normalisePath } from '../../../markdown-file-tree/normalise-path.ts';
import type { CheckResult, FileViolations, ModuleFindings } from '../../../response-contract/index.ts';

/**
 * One Module's answer for one file.
 *
 * A private local type beside its only consumer, which ARCH-005 admits and
 * which is the right call here: every Module's own outcome type is structurally
 * this, so naming it in a shared `types` file would invite a Module to import
 * the composer's vocabulary and start answering in it.
 */
interface ModuleOutcome {
  /** Root-relative, `/`-separated. */
  path: string;
  /** That Module's block, `violations` possibly empty. */
  findings: ModuleFindings;
}

/**
 * Every Module's findings for each file, keyed by path, CLEAN OUTCOMES DROPPED.
 *
 * Insertion order is preserved, so the Modules inside one file come out in the
 * order the caller concatenated them — which is the order
 * `MarkdownHarnessConfig` declares its keys, never the order the YAML mapping
 * happened to use. That is what stops one adopter's report listing Modules
 * differently from another's for the same reason their configs were typed.
 */
function findingsByPath(outcomes: readonly ModuleOutcome[]): Map<string, ModuleFindings[]> {
  const found = new Map<string, ModuleFindings[]>();

  for (const outcome of outcomes) {
    if (outcome.findings.violations.length === 0) continue;

    const existing = found.get(outcome.path);
    if (existing === undefined) found.set(outcome.path, [outcome.findings]);
    else existing.push(outcome.findings);
  }
  return found;
}

/**
 * Walker order, with any path that reported findings but was not in the corpus
 * appended rather than dropped.
 *
 * The straggler branch exists because dropping would be a VACUOUS GREEN: a
 * Module whose paths were spelled differently from the corpus list would
 * silently contribute nothing, and the report would look clean for the one
 * reason a report must never look clean.
 */
function orderedPaths(corpus: readonly string[], found: Map<string, ModuleFindings[]>): readonly string[] {
  const order = corpus.map(normalisePath);
  const known = new Set(order);

  return [...order, ...[...found.keys()].filter((path) => !known.has(path))];
}

/** Every finding in one file, across every Module that reported one. */
function countIn(file: FileViolations): number {
  return file.modules.reduce((total, module) => total + module.violations.length, 0);
}

/**
 * Compose one corpus's verdict out of every Module's outcomes.
 *
 * `governedFiles` is the UNION — the number of distinct paths at least one
 * Module claimed — which is why each Module hands back its conforming files
 * too. Counting only the files with findings would make the denominator agree
 * with the numerator and say nothing.
 *
 * @param corpus The corpus, as root-relative paths in walker order.
 * @param outcomes Every Module's outcomes, concatenated in declared Module order.
 */
export function checkResultFrom(corpus: readonly string[], outcomes: readonly ModuleOutcome[]): CheckResult {
  const found = findingsByPath(outcomes);

  const files = orderedPaths(corpus, found).flatMap((path) => {
    const modules = found.get(path);
    return modules === undefined ? [] : [{ path, modules }];
  });

  return {
    summary: {
      governedFiles: new Set(outcomes.map((outcome) => outcome.path)).size,
      invalidFiles: files.length,
      totalViolations: files.reduce((total, file) => total + countIn(file), 0),
    },
    files,
  };
}
