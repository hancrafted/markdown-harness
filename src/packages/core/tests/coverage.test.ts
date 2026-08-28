// The specification test for `coverage` — the diagnostic first match cannot give
// you for free.
//
// ITS OWN COMMAND, and therefore its own test. The stated cost of tenet 5 is
// that every losing rule is SILENT: a rule that wins no file reports nothing,
// so an ordering mistake or a typo in a glob is invisible forever, and the
// missing output is byte-identical to a clean run. This is the only diagnostic
// that costs a full files x rules matrix rather than falling out of the walk.
//
// It left the check report rather than being deleted because it answers the
// OPERATOR's question and `--check` is read by a Contributor's agent, which can
// act on none of it. Same argument, one level further out, as the one that took
// the shadowed and excluded rules off the steering answer.

import { describe, expect, it } from 'vitest';
import type { CoverageResult } from '../../contract/coverage-result.ts';
import { isConfigError } from '../../contract/response.ts';
import { coverage } from '../coverage.ts';
import { FIXTURE_CONFIG, fixtureCorpus } from './fixture-corpus.ts';

const CORPUS = fixtureCorpus();

/** Fails loudly rather than narrowing silently: a rejected config here is a broken slice, not a result. */
function covered(): CoverageResult {
  const result = coverage(FIXTURE_CONFIG, CORPUS);
  if (isConfigError(result)) throw new Error(`config rejected: ${JSON.stringify(result.faults)}`);
  return result;
}

describe('coverage is the one diagnostic first-match cannot give you for free', () => {
  it('names every rule with the files it won, so an inert rule is visible', () => {
    // The stated cost of tenet 5 is that every LOSING rule is silent. A rule
    // that wins nothing — almost always an ordering mistake, occasionally a
    // typo in a glob — is otherwise invisible forever, and no violation it
    // would have reported ever appears. This is the whole reason the full
    // files x rules matrix is worth computing.
    //
    // Keyed by `ruleId`. Counts are read off the fixture tree by hand, not
    // recomputed the way the resolver computes them.
    expect(covered().rules.map((entry) => [entry.rule.ruleId, entry.won])).toEqual([
      ['index-files', 2],
      ['log-files', 1],
      ['provenance-exemplar', 2],
      ['research', 6],
      ['skills', 3],
      ['reference', 3],
      ['workflows', 4],
      ['plain', 3],
    ]);
  });

  it('says why a rule did not win the files it selected', () => {
    // `won: 0` is the alarm; these three are the diagnosis, and each points at
    // a different fix. `shadowedBy` is what naming rules bought: it says WHICH
    // rule above took the file, where a position could only have said "one of
    // the ones before you" about a number that moves.
    //
    // The research rule selects ten files under `docs/research/`. It wins six;
    // `index.md` goes to the rule above it and `provenance.md` and
    // `provenance-broken.md` go to the exemplar rule; `vendor/upstream.md` is
    // removed by its own `excludeFiles` before it can win, which is the only
    // use exclusion has under first match.
    const research = covered().rules.find((entry) => entry.rule.ruleId === 'research');

    expect(research).toEqual({
      rule: {
        ruleId: 'research',
        selector: { path: ['docs/research/**/*.md'] },
        intent: 'Research is indexed, and an index entry copies the description',
      },
      won: 6,
      shadowed: 3,
      // Deduped, in CONFIG order — which is also the order they sit above this
      // rule, so it reads as a list of what to look at first.
      shadowedBy: ['index-files', 'provenance-exemplar'],
      excluded: 1,
    });
  });

  it('finds no inert rule in the fixture config', () => {
    // Named separately from the table because it is a different claim: the
    // table pins the numbers, this pins the property the diagnostic exists for.
    // Filtered rather than asserted with `every`, so a failure says WHICH rule.
    expect(covered().rules.filter((entry) => entry.won === 0)).toEqual([]);
  });
});
