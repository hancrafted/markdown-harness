/**
 * `check` — the whole corpus against the whole config.
 *
 * Takes config TEXT, not a parsed config: parsing and validation produce
 * `ConfigRejected`, which is report content, so both live inside this seam and
 * nothing structured crosses it except the report.
 */

import type { CheckReport, FileReport } from '../contract/check-report.ts';
import type { ConfigRejected } from '../contract/config-rejected.ts';
import type { FrontmatterRule } from '../contract/config.ts';
import type { Corpus, SourceFile } from '../contract/corpus.ts';
import { evaluate } from '../frontmatter-harness/evaluate.ts';
import { emptyRuleList, readRules } from './lib/config/parse.ts';
import { tally } from './lib/corpus/coverage.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { resolve, ruleRef, type Resolution } from './lib/corpus/select.ts';
import { extract } from './lib/frontmatter/extract.ts';

export function check(configText: string, corpus: Corpus): CheckReport | ConfigRejected {
  const rules = readRules(configText);
  if (rules.length === 0) return emptyRuleList();

  const { files, resolutions } = walk(rules, corpus);
  // Every rule gets a row, in config order, including the ones that won
  // nothing — a row that appears only when it has something to say could not
  // report the absence that matters.
  const coverage = tally(rules, resolutions);
  // Summed from `coverage` rather than counted alongside it, so the headline
  // number and the per-rule numbers are one measurement.
  const governed = coverage.reduce((total, entry) => total + entry.won, 0);

  return { report: 'check', format: 1, root: corpus.root, files, coverage, totals: { governed } };
}

/** The faults found, and every rule's fate on every path — from ONE pass over the corpus. */
interface Walk {
  files: readonly FileReport[];
  resolutions: readonly Resolution[];
}

function walk(rules: readonly FrontmatterRule[], corpus: Corpus): Walk {
  const files: FileReport[] = [];
  const resolutions: Resolution[] = [];

  for (const file of corpus.files) {
    const resolution = resolve(rules, normalize(file.path));
    // Kept whatever the outcome: `coverage` is a fold over the LOSERS, and the
    // losers are exactly what a walk that stopped at the first match throws
    // away.
    resolutions.push(resolution);
    // No winner means invisible (tenet 6): not reported, not counted, not read.
    if (resolution.winner === null) continue;
    const report = inspect(file, resolution.winner);
    if (report !== null) files.push(report);
  }

  // Sorted here rather than trusted from the caller: a frozen report must not
  // depend on somebody's directory-iteration order, and `src/cli.ts` gets its
  // paths from `globSync`.
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, resolutions };
}

function inspect(file: SourceFile, rule: FrontmatterRule): FileReport | null {
  const extracted = extract(file.text);
  const frontmatter = extracted.kind === 'present' ? extracted.frontmatter : null;
  const violations = evaluate(rule, frontmatter);

  if (violations.length === 0) return null;
  // Keyed by Module from the start: `frontmatter-harness` is the only Module
  // today, and adding the key later would move every violation in every stored
  // report.
  return { path: normalize(file.path), rule: ruleRef(rule), violations: { frontmatter: violations } };
}
