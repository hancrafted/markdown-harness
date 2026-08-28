/**
 * `check` — the whole corpus against the whole config.
 *
 * Takes config TEXT, not a parsed config: parsing and validation produce a
 * `ConfigErrorResult`, which is result content, so both live inside this seam and
 * nothing structured crosses it except the result.
 */

import type { CheckResult, FileFaults } from '../contract/check-result.ts';
import type { ConfigErrorResult } from '../contract/config-error.ts';
import type { FrontmatterRule } from '../contract/config.ts';
import type { Corpus, SourceFile } from '../contract/corpus.ts';
import { evaluate } from '../frontmatter-harness/evaluate.ts';
import { configFaults, readRules, rejected } from './lib/config/parse.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { resolve } from './lib/corpus/select.ts';
import { extract } from './lib/frontmatter/extract.ts';

export function check(configText: string, corpus: Corpus): CheckResult | ConfigErrorResult {
  const rules = readRules(configText);
  const faults = configFaults(rules);
  if (faults.length > 0) return rejected(faults);

  const { files, governedFiles } = walk(rules, corpus);

  return {
    // Computed from `files` here rather than counted a second time alongside it,
    // so the summary and the list cannot disagree.
    summary: {
      governedFiles,
      faultyFiles: files.length,
      totalViolations: files.reduce((total, file) => total + file.violations.length, 0),
    },
    files,
  };
}

interface Walk {
  files: readonly FileFaults[];
  governedFiles: number;
}

function walk(rules: readonly FrontmatterRule[], corpus: Corpus): Walk {
  const files: FileFaults[] = [];
  let governedFiles = 0;

  for (const file of corpus.files) {
    const { winner } = resolve(rules, normalize(file.path));
    // No winner means invisible (tenet 6): not reported, not counted, not read.
    if (winner === null) continue;
    governedFiles += 1;
    const faults = inspect(file, winner);
    if (faults !== null) files.push(faults);
  }

  // Sorted here rather than trusted from the caller: a frozen report must not
  // depend on somebody's directory-iteration order, and `src/cli.ts` gets its
  // paths from `globSync`.
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, governedFiles };
}

function inspect(file: SourceFile, rule: FrontmatterRule): FileFaults | null {
  const extracted = extract(file.text);
  const frontmatter = extracted.kind === 'present' ? extracted.frontmatter : null;
  const violations = evaluate(rule, frontmatter);

  if (violations.length === 0) return null;
  return { path: normalize(file.path), ruleId: rule.ruleId, ruleIntent: rule.intent, violations };
}
