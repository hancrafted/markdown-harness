/**
 * `check` — the whole corpus against the whole config.
 *
 * Takes config TEXT, not a parsed config: parsing and validation produce
 * `ConfigRejected`, which is report content, so both live inside this seam and
 * nothing structured crosses it except the report.
 */

import type { CheckReport, FileReport } from '../contract/check-report.ts';
import type { ConfigRejected } from '../contract/config-rejected.ts';
import type { Corpus, SourceFile } from '../contract/corpus.ts';
import { evaluate } from '../frontmatter-harness/evaluate.ts';
import { readRules } from './lib/config/parse.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { selectorRef, winner, type Winner } from './lib/corpus/select.ts';
import { extract } from './lib/frontmatter/extract.ts';

export function check(configText: string, corpus: Corpus): CheckReport | ConfigRejected {
  const rules = readRules(configText);
  if (rules.length === 0) {
    return { report: 'config-rejected', faults: [{ code: 'empty-rule-list', at: 'frontmatter.rules' }] };
  }

  const files: FileReport[] = [];
  let governed = 0;

  for (const file of corpus.files) {
    const won = winner(rules, normalize(file.path));
    // No winner means invisible (tenet 6): not reported, not counted, not read.
    if (won === null) continue;
    governed += 1;
    const report = inspect(file, won);
    if (report !== null) files.push(report);
  }

  // Sorted here rather than trusted from the caller: a frozen report must not
  // depend on somebody's directory-iteration order, and `src/cli.ts` gets its
  // paths from `globSync`.
  files.sort((left, right) => left.path.localeCompare(right.path));

  return { report: 'check', format: 1, root: corpus.root, files, totals: { governed } };
}

function inspect(file: SourceFile, won: Winner): FileReport | null {
  const path = normalize(file.path);
  const rule = { index: won.index, selector: selectorRef(won.rule) };
  const extracted = extract(file.text);

  const violations = evaluate(won.rule, extracted.kind === 'present' ? extracted.frontmatter : null);
  return violations.length === 0 ? null : { path, rule, fault: 'violations', violations };
}
