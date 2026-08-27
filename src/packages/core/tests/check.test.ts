// The specification test for `check`, run against `fixtures/` — the synthetic
// repo root whose every file states in its own body which rule should win and
// whether it passes. Those verdicts are the expected values here; none of them
// is recomputed the way the implementation computes it.
//
// Assertions are on the exact set of violations reported, never on internal
// resolution state.

import { describe, expect, it } from 'vitest';
import type { CheckReport } from '../../contract/check-report.ts';
import { check } from '../check.ts';
import { FIXTURE_CONFIG, fixtureCorpus } from './fixture-corpus.ts';

const CORPUS = fixtureCorpus();

/** Fails loudly rather than narrowing silently: a rejected config here is a broken slice, not a result. */
function checked(): CheckReport {
  const report = check(FIXTURE_CONFIG, CORPUS);
  if (report.report !== 'check') throw new Error(`config rejected: ${JSON.stringify(report.faults)}`);
  return report;
}

describe('a config fault is report content, not a throw', () => {
  it('rejects an empty rule list', () => {
    const report = check('frontmatter:\n  rules: []\n', { root: 'fixtures', files: [] });

    expect(report).toEqual({
      report: 'config-rejected',
      faults: [{ code: 'empty-rule-list', at: 'frontmatter.rules' }],
    });
  });
});

describe('governance is opt-in by path', () => {
  it('leaves an ungoverned file out of the report, and out of the count', () => {
    const report = checked();

    // Two faults in this file are REAL — `type: Not A Value Any Rule Allows`
    // appears in no rule's `allowed` records, and `description: ''` fails
    // `presence: required`. It is excluded from the research rule by
    // `excludeFiles` and matched by nothing after it, so neither may ever
    // surface. That is what the file tests.
    expect(report.files.map((file) => file.path)).not.toContain('docs/research/vendor/upstream.md');
    expect(report.totals.governed).toBe(13);
  });

  it('counts the invisible file nowhere, so the arithmetic belongs to the test', () => {
    // Tenet 6: never reported, NEVER COUNTED. There is deliberately no
    // `invisible` total to assert — a field holding that number would be the
    // report noticing the file. 14 files in, 13 governed.
    expect(CORPUS.files).toHaveLength(14);
    expect(CORPUS.files.length - checked().totals.governed).toBe(1);
  });
});
