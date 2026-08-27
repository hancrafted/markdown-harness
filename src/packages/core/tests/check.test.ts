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

describe('presence', () => {
  it('reports the one field the plain rule asks for, and nothing else', () => {
    // The rule's whole payload is `type: { presence: required }`. Under the old
    // Floor this file failed by construction, on a rule that named no fields at
    // all; now it fails because a rule asked.
    const file = checked().files.find((entry) => entry.path === 'docs/plain/untyped.md');

    expect(file).toEqual({
      path: 'docs/plain/untyped.md',
      rule: { index: 7, selector: { path: ['docs/plain/**/*.md'] } },
      fault: 'violations',
      violations: [
        {
          constraint: 'presence',
          at: 'type',
          operand: 'required',
          found: { kind: 'absent' },
          intent: 'Everything under plain/ still has to say what it is',
        },
      ],
    });
  });
});

describe('presence and membership are separate opt-ins', () => {
  it('checks no vocabulary on a rule that declares none', () => {
    // `docs/plain/notes.md` carries `type: reference`, which is outside the
    // reference rule's vocabulary — and conforms anyway, because the plain rule
    // declares no vocabulary at all. Asking for presence never implies
    // membership. Nothing merges, so the reference rule's `allowed` records
    // have no reach here.
    expect(checked().files.map((file) => file.path)).not.toContain('docs/plain/notes.md');
  });
});

describe('first match wins, nothing merges, nothing is inherited', () => {
  it('gives a reserved filename to the rule above the broad research rule', () => {
    // The `index.md` rule sits at index 0 and forbids frontmatter; the broad
    // research rule at index 3 requires `type` and `description`, which this
    // file has. Ordering decides, and the loser is silent. It also proves the
    // payload exclusivity in the same file: `frontmatter: forbidden` can carry
    // no `fields`, so a rule cannot both forbid frontmatter and require a key
    // in it.
    const file = checked().files.find((entry) => entry.path === 'docs/research/index.md');

    expect(file).toEqual({
      path: 'docs/research/index.md',
      rule: { index: 0, selector: { fileName: 'index.md' } },
      fault: 'violations',
      violations: [
        {
          constraint: 'frontmatter',
          at: null,
          found: { kind: 'mapping', keys: ['type', 'description'] },
          intent: 'OKF §8 (Index files): an index enumerates a directory, and carries no frontmatter',
        },
      ],
    });
  });
});
