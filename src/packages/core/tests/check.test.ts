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
  return reportFor(path).violations.frontmatter;
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
      rule: {
        ruleId: 'plain',
        selector: { path: ['docs/plain/**/*.md'] },
        intent: 'Everything under plain/ still has to say what it is',
      },
      violations: {
        frontmatter: [
          { constraint: 'presence', field: 'type', found: { kind: 'absent' }, expected: { presence: 'required' } },
        ],
      },
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
      rule: {
        ruleId: 'index-files',
        selector: { fileName: 'index.md' },
        intent: 'OKF §8 (Index files): an index enumerates a directory, and carries no frontmatter',
      },
      violations: {
        frontmatter: [
          {
            constraint: 'frontmatter',
            field: null,
            found: { kind: 'mapping', keys: ['type', 'description'] },
            expected: { frontmatter: 'forbidden' },
          },
        ],
      },
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
      field: 'status',
      found: { kind: 'scalar', value: 'retired' },
      expected: {
        allowed: [
          { value: 'draft', intent: 'Written down, not yet trusted.' },
          { value: 'stable', intent: 'Safe to rely on.' },
          { value: 'deprecated', intent: 'Still here, no longer to be followed.' },
        ],
      },
    });
  });
});

describe('a pattern never arrives unexplained', () => {
  it('reports the pattern with the sibling intent the config language requires', () => {
    const violation = violationsOf('docs/reference/legacy.md').find((entry) => entry.constraint === 'pattern');

    expect(violation).toEqual({
      constraint: 'pattern',
      field: 'slug',
      found: { kind: 'scalar', value: 'Legacy_Reference' },
      // The fragment is verbatim, so the regex travels — and so does the
      // mandatory sibling `intent`. Requiring that sibling is now the whole of
      // what keeps the Kubernetes failure (`"failed rule: {Rule}"`) away: an
      // unexplained pattern is a CONFIG error rather than a report we have to
      // paper over.
      expected: {
        pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
        intent: 'Slugs are lowercase words joined by single hyphens',
      },
    });
  });

  it('never reports a pattern without one, anywhere in the corpus', () => {
    // The invariant that replaced "no field may hold a regex". That one was
    // structural and stronger; this one is checkable and is what the config
    // language actually promises. Asserted over the whole corpus rather than one
    // file, because a single example would not be an invariant.
    const patterns = checked()
      .files.flatMap((file) => file.violations.frontmatter)
      .filter((violation) => 'pattern' in violation.expected);

    expect(patterns.length).toBeGreaterThan(0);
    for (const violation of patterns) {
      expect('intent' in violation.expected && violation.expected.intent, JSON.stringify(violation)).toBeTruthy();
    }
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
      field: 'reviewedBy',
      found: { kind: 'scalar', value: 'nobody' },
      expected: {
        unknownKeys: 'forbidden',
        allowedKeys: ['type', 'description', 'status', 'slug', 'draft'],
      },
    });
  });

  it('orders a file’s violations by address, so no YAML key order can move them', () => {
    // design-ADR 0001 records that the config language does not constrain key
    // order, and quotes YAML 1.2.2: mapping key order is a serialization detail
    // that "should not be used". A report ordered by config order or by
    // frontmatter order would therefore depend on something the specification
    // says not to depend on. Sorted by address, this report is the same report
    // whatever order the keys were written in.
    expect(violationsOf('docs/reference/legacy.md').map((entry) => [entry.constraint, entry.field])).toEqual([
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
        field: null,
        found: { satisfied: ['name', 'title'] },
        expected: { exactlyOneOf: ['name', 'title'] },
      },
    ]);
  });

  it('passes a file that satisfies exactly one', () => {
    expect(checked().files.map((file) => file.path)).not.toContain('docs/skills/writing/SKILL.md');
  });
});

describe('addressing reaches one level, and the three named formats', () => {
  it('finds nothing wrong with the provenance exemplar', () => {
    // The one file that reaches every named format and both nesting depths, and
    // the one matched by the narrow rule sitting ABOVE the broad research rule.
    // Conformance alone would also be produced by an addresser that reached
    // nothing, so the Module tests below break each address in turn.
    expect(checked().files.map((file) => file.path)).not.toContain('docs/research/provenance.md');
  });
});

describe('an unmatched constraint is not a weaker constraint — it does not exist', () => {
  it('passes a malformed actor that the winning rule says nothing about', () => {
    // `docs/research/bad-actor.md` carries `generated.by: human/hancrafted`, a
    // malformed Actor. The narrow provenance rule WOULD report it — but that
    // rule did not win here, and the broad research rule says nothing about
    // `generated`. Nothing merges.
    //
    // Under the old Floor this file FAILED, because actor form was checked on
    // every governed file regardless of its winning rule. That guarantee is
    // exactly what the Floor's removal traded away, and this file is the
    // receipt.
    expect(checked().files.map((file) => file.path)).not.toContain('docs/research/bad-actor.md');
  });
});

describe('the frozen report over the whole corpus', () => {
  /** Every fault the corpus produces, flattened: one row per violation. */
  function rows(): readonly (readonly [string, string, string | null])[] {
    return checked().files.flatMap((file) =>
      file.violations.frontmatter.map((entry) => [file.path, entry.constraint, entry.field] as const),
    );
  }

  it('is exactly this', () => {
    // The acceptance criterion for the whole build. Sorted by path, then by
    // address within a file, so this table is the same table on any machine and
    // under any YAML library.
    expect(rows()).toEqual([
      ['docs/plain/untyped.md', 'presence', 'type'],
      ['docs/reference/legacy.md', 'unknownKeys', 'reviewedBy'],
      ['docs/reference/legacy.md', 'pattern', 'slug'],
      ['docs/reference/legacy.md', 'allowed', 'status'],
      ['docs/research/index.md', 'frontmatter', null],
      ['docs/skills/legacy/SKILL.md', 'exactlyOneOf', null],
    ]);
  });

  it('counts 6 violations across 4 files, 13 governed, 9 conforming, 1 invisible', () => {
    const report = checked();

    expect(rows()).toHaveLength(6);
    expect(report.files).toHaveLength(4);
    expect(report.totals.governed).toBe(13);
    // Both derived, deliberately: only `governed` is not recoverable from the
    // rest, so only `governed` is stored.
    expect(report.totals.governed - report.files.length).toBe(9);
    expect(CORPUS.files.length - report.totals.governed).toBe(1);
  });

  it('declares the format version and echoes the root as given', () => {
    expect(checked().format).toBe('v1');
    expect(checked().root).toBe('fixtures');
  });
});

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
    expect(checked().coverage.map((entry) => [entry.rule.ruleId, entry.won])).toEqual([
      ['index-files', 2],
      ['log-files', 1],
      ['provenance-exemplar', 1],
      ['research', 2],
      ['skills', 2],
      ['reference', 2],
      ['workflows', 1],
      ['plain', 2],
    ]);
  });

  it('says why a rule did not win the files it selected', () => {
    // `won: 0` is the alarm; these three are the diagnosis, and each points at
    // a different fix. `shadowedBy` is what naming rules bought: it says WHICH
    // rule above took the file, where a position could only have said "one of
    // the ones before you" about a number that moves.
    //
    // The research rule selects five files under `docs/research/`. It wins
    // `bad-actor.md` and `survey.md`; `index.md` and `provenance.md` go to
    // rules above it; `vendor/upstream.md` is removed by its own
    // `excludeFiles` before it can win, which is the only use exclusion has
    // under first match.
    const research = checked().coverage.find((entry) => entry.rule.ruleId === 'research');

    expect(research).toEqual({
      rule: {
        ruleId: 'research',
        selector: { path: ['docs/research/**/*.md'] },
        intent: 'Research is indexed, and an index entry copies the description',
      },
      won: 2,
      shadowed: 2,
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
    expect(checked().coverage.filter((entry) => entry.won === 0)).toEqual([]);
  });
});

describe('the corpus is a specification, so it states what it does not yet cover', () => {
  /**
   * Every form a fault can take. `presence` is split, because `required` and
   * `forbidden` are different clauses that happen to share a key.
   */
  const FORMS: readonly string[] = [
    'allOf',
    'allowed',
    'anyOf',
    'exactlyOneOf',
    'format',
    'frontmatter',
    'itemMaxLength',
    'maxItems',
    'maxLength',
    'minItems',
    'minLength',
    'pattern',
    'per-entry',
    'presence:forbidden',
    'presence:required',
    'unknownKeys',
    'unparseable-frontmatter',
  ];

  /**
   * Forms NO FIXTURE FILE FAILS.
   *
   * `fixtures.test.ts` proves every config KEY is written. This proves which
   * violation FORMS are produced — and under "the corpus is the specification",
   * a form with no failing fixture is a clause of the specification that has
   * never been read back.
   *
   * The list is asserted in both directions, so adding a fixture without
   * shortening it fails, and shortening it without adding a fixture fails too.
   * A permanently-red test would have said the same thing once and then been
   * ignored.
   */
  const UNCOVERED: readonly string[] = [
    'allOf',
    'anyOf',
    'format',
    'itemMaxLength',
    'maxItems',
    'maxLength',
    'minItems',
    'minLength',
    'per-entry',
    'presence:forbidden',
    'unparseable-frontmatter',
  ];

  function produced(): ReadonlySet<string> {
    const forms = checked().files.flatMap((file) =>
      file.violations.frontmatter.flatMap((entry) => [
        entry.constraint === 'presence' ? `presence:${entry.expected.presence}` : entry.constraint,
        ...(entry.field?.includes('[') ? ['per-entry'] : []),
      ]),
    );
    return new Set(forms);
  }

  it('names eleven clauses no fixture file exercises', () => {
    expect([...produced()].sort()).toEqual(FORMS.filter((form) => !UNCOVERED.includes(form)));
    expect(UNCOVERED).toHaveLength(11);
  });

  it.each(FORMS.filter((form) => !UNCOVERED.includes(form)))('produces the %s form', (form) => {
    expect(produced()).toContain(form);
  });
});
