// The specification test for `check`, run against `fixtures/` — the synthetic
// repo root whose every file states in its own body which rule should win and
// whether it passes. Those verdicts are the expected values here; none of them
// is recomputed the way the implementation computes it.
//
// Assertions are on the exact set of violations reported, never on internal
// resolution state.

import { describe, expect, it } from 'vitest';
import type { CheckReport, FileReport } from '../../contract/check-report.ts';
import type { Violation } from '../../contract/violation.ts';
import { check } from '../check.ts';
import { FIXTURE_CONFIG, fixtureCorpus } from './fixture-corpus.ts';

const CORPUS = fixtureCorpus();

/** Fails loudly rather than narrowing silently: a rejected config here is a broken slice, not a result. */
function checked(): CheckReport {
  const report = check(FIXTURE_CONFIG, CORPUS);
  if (report.report !== 'check') throw new Error(`config rejected: ${JSON.stringify(report.faults)}`);
  return report;
}

function reportFor(path: string): FileReport {
  const file = checked().files.find((entry) => entry.path === path);
  if (file === undefined) throw new Error(`${path} reported no fault`);
  return file;
}

function violationsOf(path: string): readonly Violation[] {
  const file = reportFor(path);
  if (file.fault !== 'violations') throw new Error(`${path} reported ${file.fault}`);
  return file.violations;
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

describe('a failed membership check hands over the whole vocabulary', () => {
  it('carries every allowed record, uncapped and in the order the config wrote them', () => {
    // The point of the record form: this stanza is fixable WITHOUT opening the
    // config, because the whole vocabulary and each value's meaning arrived
    // with the failure.
    const violation = violationsOf('docs/reference/legacy.md').find((entry) => entry.constraint === 'allowed');

    expect(violation).toEqual({
      constraint: 'allowed',
      at: 'status',
      operand: [
        { value: 'draft', intent: 'Written down, not yet trusted.' },
        { value: 'stable', intent: 'Safe to rely on.' },
        { value: 'deprecated', intent: 'Still here, no longer to be followed.' },
      ],
      found: { kind: 'scalar', value: 'retired' },
      intent: 'Reference pages are looked up by slug and say how far they can be trusted',
    });
  });
});

describe('the regex has nowhere to leak from', () => {
  const REGEX = '^[a-z0-9]+(-[a-z0-9]+)*$';

  it('reports a pattern failure with no field that could hold the pattern', () => {
    const violation = violationsOf('docs/reference/legacy.md').find((entry) => entry.constraint === 'pattern');

    expect(violation).toEqual({
      constraint: 'pattern',
      at: 'slug',
      found: { kind: 'scalar', value: 'Legacy_Reference' },
      intent: 'Slugs are lowercase words joined by single hyphens',
    });
    // Structural rather than incidental: this variant has no `operand`, which is
    // why the config language makes a sibling `intent` mandatory beside
    // `pattern`. Kubernetes accepts `"failed rule: {Rule}"`; VS Code bolted
    // `patternErrorMessage` on to escape it.
    expect(Object.keys(violation ?? {})).not.toContain('operand');
  });

  it('puts the pattern nowhere in the whole report', () => {
    expect(JSON.stringify(checked())).not.toContain(REGEX);
    expect(FIXTURE_CONFIG).toContain(REGEX);
  });
});

describe('unknownKeys closes the key set', () => {
  it('names the offending key and the keys the rule does name', () => {
    // "Known" is the set of TOP-LEVEL SEGMENTS of the rule's addresses, so a
    // rule constraining `generated.by` makes `generated` known. The reference
    // rule is the only one in the fixture config that closes its key set.
    const violation = violationsOf('docs/reference/legacy.md').find((entry) => entry.constraint === 'unknownKeys');

    expect(violation).toEqual({
      constraint: 'unknownKeys',
      at: 'reviewedBy',
      known: ['type', 'description', 'status', 'slug', 'draft'],
      found: { kind: 'scalar', value: 'nobody' },
      intent: 'Reference pages are looked up by slug and say how far they can be trusted',
    });
  });

  it('orders a file’s violations by address, so no YAML key order can move them', () => {
    // design-ADR 0001 records that the config language does not constrain key
    // order, and quotes YAML 1.2.2: mapping key order is a serialization detail
    // that "should not be used". A report ordered by config order or by
    // frontmatter order would therefore depend on something the specification
    // says not to depend on. Sorted by address, this report is the same report
    // whatever order the keys were written in.
    expect(violationsOf('docs/reference/legacy.md').map((entry) => [entry.constraint, entry.at])).toEqual([
      ['unknownKeys', 'reviewedBy'],
      ['pattern', 'slug'],
      ['allowed', 'status'],
    ]);
  });
});

describe('exactlyOneOf means exactly one', () => {
  it('fails a file that satisfies BOTH arms', () => {
    // The easy bug is implementing this as `anyOf`, which passes here. The
    // fixture exists to catch that: `SKILL.md` carries both `name` and `title`,
    // and a skill is addressed by exactly one of its two names.
    expect(violationsOf('docs/skills/legacy/SKILL.md')).toEqual([
      {
        constraint: 'exactlyOneOf',
        at: null,
        operand: ['name', 'title'],
        satisfied: ['name', 'title'],
        intent: 'A skill is addressed by exactly one of its two names',
      },
    ]);
  });

  it('passes a file that satisfies exactly one', () => {
    expect(checked().files.map((file) => file.path)).not.toContain('docs/skills/writing/SKILL.md');
  });
});
