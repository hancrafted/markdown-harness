/**
 * `check` — the whole corpus against the whole config.
 *
 * Takes config TEXT, not a parsed config: parsing and validation produce
 * `ConfigRejected`, which is report content, so both live inside this seam and
 * nothing structured crosses it except the report.
 */

import type { CheckReport, FileReport } from '../contract/check-report.ts';
import type { ConfigRejected } from '../contract/config-rejected.ts';
import type { Corpus } from '../contract/corpus.ts';
import { readRules } from './lib/config/parse.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { winner } from './lib/corpus/select.ts';

export function check(configText: string, corpus: Corpus): CheckReport | ConfigRejected {
  const rules = readRules(configText);
  if (rules.length === 0) {
    return { report: 'config-rejected', faults: [{ code: 'empty-rule-list', at: 'frontmatter.rules' }] };
  }

  const files: FileReport[] = [];
  let governed = 0;

  for (const file of corpus.files) {
    const path = normalize(file.path);
    // No winner means invisible (tenet 6): not reported, not counted, and — as
    // the loop shows — not even read.
    if (winner(rules, path) === null) continue;
    governed += 1;
  }

  return { report: 'check', format: 1, root: corpus.root, files, totals: { governed } };
}
