/**
 * `coverage` — how every rule fared across the corpus.
 *
 * A separate entry point rather than a field on the check result, because it
 * answers the OPERATOR's question and `check` is read by a Contributor's agent.
 * See `contract/coverage-result.ts` for why that split is worth a command.
 *
 * It needs the corpus but never its contents: resolution is path-only, so a
 * caller may hand over files whose `text` it did not bother to read.
 */

import type { ConfigErrorResult } from '../contract/config-error.ts';
import type { Corpus } from '../contract/corpus.ts';
import type { CoverageResult } from '../contract/coverage-result.ts';
import { configFaults, readRules, rejected } from './lib/config/parse.ts';
import { tally } from './lib/corpus/coverage.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { resolve } from './lib/corpus/select.ts';

export function coverage(configText: string, corpus: Corpus): CoverageResult | ConfigErrorResult {
  const rules = readRules(configText);
  const faults = configFaults(rules);
  if (faults.length > 0) return rejected(faults);

  // Every resolution is kept, whatever the outcome: coverage is a fold over the
  // LOSERS, and the losers are exactly what a walk that stopped at the first
  // match throws away.
  const resolutions = corpus.files.map((file) => resolve(rules, normalize(file.path)));
  return { rules: tally(rules, resolutions) };
}
