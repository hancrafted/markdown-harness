// The specification test for `check`, run against `fixtures/` — the synthetic
// repo root whose every file states in its own body which rule should win and
// whether it passes. Those verdicts are the expected values here; none of them
// is recomputed the way the implementation computes it.
//
// Assertions are on the exact set of violations reported, never on internal
// resolution state.

import { describe, expect, it } from 'vitest';
import type { CheckResult, FileFaults } from '../../contract/check-result.ts';
import { CONFIG_FAULT } from '../../contract/config-error.ts';
import { isConfigError } from '../../contract/response.ts';
import { VIOLATION, type ViolationCode } from '../../contract/violation-code.ts';
import type { Violation } from '../../contract/violation.ts';
import { check } from '../check.ts';
import { FIXTURE_CONFIG, fixtureCorpus } from './fixture-corpus.ts';

const CORPUS = fixtureCorpus();

/** Fails loudly rather than narrowing silently: a rejected config here is a broken slice, not a result. */
function checked(): CheckResult {
  const result = check(FIXTURE_CONFIG, CORPUS);
  if (isConfigError(result)) throw new Error(`config rejected: ${JSON.stringify(result.faults)}`);
  return result;
}

function reportFor(path: string): FileFaults {
  const file = checked().files.find((entry) => entry.path === path);
  if (file === undefined) throw new Error(`${path} reported no fault`);
  return file;
}

function violationsOf(path: string): readonly Violation[] {
  return reportFor(path).violations;
}

describe('a config fault is result content, not a throw', () => {
  it('rejects an empty rule list', () => {
    const result = check('frontmatter:\n  rules: []\n', { root: 'fixtures', files: [] });

    expect(result).toEqual({
      error: 'CONFIG_REJECTED',
      faults: [{ code: CONFIG_FAULT.EMPTY_RULE_LIST, location: 'frontmatter.rules' }],
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
    expect(report.summary.governedFiles).toBe(24);
  });

  it('counts the invisible file nowhere, so the arithmetic belongs to the test', () => {
    // Tenet 6: never reported, NEVER COUNTED. There is deliberately no
    // `invisible` total to assert — a field holding that number would be the
    // report noticing the file. 25 files in, 24 governed.
    expect(CORPUS.files).toHaveLength(25);
    expect(CORPUS.files.length - checked().summary.governedFiles).toBe(1);
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
      // Flat, and no `selector`. Which glob matched is the Operator's question
      // while debugging a config, and `--coverage` answers it for every rule at
      // once; an agent repairing this file can act on none of it.
      ruleId: 'plain',
      ruleIntent: 'Everything under plain/ still has to say what it is',
      violations: [
        // NO `value` key at all. The address named nothing, and `value: null`
        // would claim the key was written and holds nothing — which is the
        // neighbouring file, and the neighbouring code.
        { field: 'type', violation: VIOLATION.MISSING_REQUIRED_FIELD, requirement: { presence: 'required' } },
      ],
    });
  });

  it('separates a key never written from a key written empty', () => {
    // The pair the split exists for, asserted side by side. One value key
    // present and one absent, one code each, and the same requirement — so the
    // ONLY thing telling a consumer which repair to make is the code.
    const empty = checked().files.find((entry) => entry.path === 'docs/plain/empty-type.md');

    expect(empty?.violations).toEqual([
      { field: 'type', value: null, violation: VIOLATION.EMPTY_REQUIRED_FIELD, requirement: { presence: 'required' } },
    ]);
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
      ruleId: 'index-files',
      ruleIntent: 'OKF §8 (Index files): an index enumerates a directory, and carries no frontmatter',
      violations: [
        {
          field: null,
          value: { keys: ['type', 'description'] },
          violation: VIOLATION.FRONTMATTER_FORBIDDEN,
          requirement: { frontmatter: 'forbidden' },
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
    const violation = violationsOf('docs/reference/legacy.md').find(
      (entry) => entry.violation === VIOLATION.VALUE_NOT_ALLOWED,
    );

    expect(violation).toEqual({
      field: 'status',
      value: 'retired',
      violation: VIOLATION.VALUE_NOT_ALLOWED,
      requirement: {
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
    const violation = violationsOf('docs/reference/legacy.md').find(
      (entry) => entry.violation === VIOLATION.PATTERN_MISMATCH,
    );

    expect(violation).toEqual({
      field: 'slug',
      value: 'Legacy_Reference',
      violation: VIOLATION.PATTERN_MISMATCH,
      // The fragment is verbatim, so the regex travels — and so does the
      // mandatory sibling `intent`. Requiring that sibling is now the whole of
      // what keeps the Kubernetes failure (`"failed rule: {Rule}"`) away: an
      // unexplained pattern is a CONFIG error rather than a report we have to
      // paper over.
      requirement: {
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
      .files.flatMap((file) => file.violations)
      .filter((violation) => 'pattern' in violation.requirement);

    expect(patterns.length).toBeGreaterThan(0);
    for (const violation of patterns) {
      expect('intent' in violation.requirement && violation.requirement.intent, JSON.stringify(violation)).toBeTruthy();
    }
  });
});

describe('unknownKeys closes the key set', () => {
  it('names the offending key and the keys the rule does name', () => {
    // "Known" is the set of TOP-LEVEL SEGMENTS of the rule's addresses, so a
    // rule constraining `generated.by` makes `generated` known. The reference
    // rule is the only one in the fixture config that closes its key set.
    const violation = violationsOf('docs/reference/legacy.md').find(
      (entry) => entry.violation === VIOLATION.UNKNOWN_KEY_FORBIDDEN,
    );

    expect(violation).toEqual({
      field: 'reviewedBy',
      value: 'nobody',
      violation: VIOLATION.UNKNOWN_KEY_FORBIDDEN,
      requirement: {
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
    expect(violationsOf('docs/reference/legacy.md').map((entry) => [entry.violation, entry.field])).toEqual([
      [VIOLATION.UNKNOWN_KEY_FORBIDDEN, 'reviewedBy'],
      [VIOLATION.PATTERN_MISMATCH, 'slug'],
      [VIOLATION.VALUE_NOT_ALLOWED, 'status'],
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
        field: null,
        satisfied: ['name', 'title'],
        // BOTH arms satisfied, so the code says MULTIPLE and the repair reads as
        // "remove one". An empty set fails the same clause and wants the
        // opposite repair, which is why the two are not one code.
        violation: VIOLATION.EXACTLY_ONE_OF_MULTIPLE_PRESENT,
        requirement: { exactlyOneOf: ['name', 'title'] },
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
      file.violations.map((entry) => [file.path, entry.violation, entry.field] as const),
    );
  }

  it('is exactly this', () => {
    // The acceptance criterion for the whole build. Sorted by path, then by
    // address within a file, so this table is the same table on any machine and
    // under any YAML library.
    expect(rows()).toEqual([
      // The two presence codes side by side, on two files whose only difference
      // is that one wrote the key and said nothing. Under one `presence` code
      // these two rows were indistinguishable.
      ['docs/plain/empty-type.md', VIOLATION.EMPTY_REQUIRED_FIELD, 'type'],
      ['docs/plain/untyped.md', VIOLATION.MISSING_REQUIRED_FIELD, 'type'],
      ['docs/reference/drafty.md', VIOLATION.FORBIDDEN_FIELD_PRESENT, 'draft'],
      ['docs/reference/legacy.md', VIOLATION.UNKNOWN_KEY_FORBIDDEN, 'reviewedBy'],
      ['docs/reference/legacy.md', VIOLATION.PATTERN_MISMATCH, 'slug'],
      ['docs/reference/legacy.md', VIOLATION.VALUE_NOT_ALLOWED, 'status'],
      ['docs/research/index.md', VIOLATION.FRONTMATTER_FORBIDDEN, null],
      // The one violation in the corpus addressed to the OPERATOR: three list
      // constraints over a string, reported once because the collision belongs
      // to the address rather than to each constraint.
      ['docs/research/mistyped-tags.md', VIOLATION.CONSTRAINT_SHAPE_MISMATCH, 'tags'],
      ['docs/research/over-tagged.md', VIOLATION.TOO_MANY_ITEMS, 'tags'],
      ['docs/research/over-tagged.md', VIOLATION.ITEM_TOO_LONG, 'tags[5]'],
      ['docs/research/provenance-broken.md', VIOLATION.FORMAT_MISMATCH, 'generated.at'],
      ['docs/research/provenance-broken.md', VIOLATION.FORMAT_MISMATCH, 'generated.by'],
      ['docs/research/provenance-broken.md', VIOLATION.FORMAT_MISMATCH, 'sources[1].resource'],
      ['docs/research/provenance-broken.md', VIOLATION.FORMAT_MISMATCH, 'stale_after'],
      ['docs/research/provenance-broken.md', VIOLATION.FORMAT_MISMATCH, 'verified[0].at'],
      ['docs/research/unsourced.md', VIOLATION.ANY_OF_UNSATISFIED, null],
      ['docs/research/untagged.md', VIOLATION.TOO_FEW_ITEMS, 'tags'],
      // The same clause, failing from both directions, on two files.
      ['docs/skills/anonymous/SKILL.md', VIOLATION.EXACTLY_ONE_OF_NONE_PRESENT, null],
      ['docs/skills/legacy/SKILL.md', VIOLATION.EXACTLY_ONE_OF_MULTIPLE_PRESENT, null],
      ['docs/workflows/overlong.md', VIOLATION.VALUE_TOO_LONG, 'title'],
      ['docs/workflows/terse.md', VIOLATION.VALUE_TOO_SHORT, 'title'],
      ['docs/workflows/undescribed.md', VIOLATION.ALL_OF_UNSATISFIED, null],
    ]);
  });

  it('counts 22 violations across 15 files, 24 governed, 9 conforming, 1 invisible', () => {
    const report = checked();

    expect(rows()).toHaveLength(22);
    expect(report.files).toHaveLength(15);

    // The summary asserted against the list it was computed FROM, which is what
    // makes storing two derivable counts safe: they are one measurement rendered
    // twice rather than two measurements that could disagree. An agent asked to
    // sum an array to find out whether anything is wrong is being asked the one
    // thing it is least reliable at.
    expect(report.summary).toEqual({ governedFiles: 24, faultyFiles: 15, totalViolations: 22 });
    expect(report.summary.faultyFiles).toBe(report.files.length);
    expect(report.summary.totalViolations).toBe(rows().length);
    expect(report.summary.governedFiles - report.summary.faultyFiles).toBe(9);
    expect(CORPUS.files.length - report.summary.governedFiles).toBe(1);
  });
});

describe('the corpus is a specification, so it states what it does not yet cover', () => {
  /**
   * Every form a fault can take: every code the contract defines, DERIVED rather
   * than restated, plus the two forms that are not codes.
   *
   * Deriving it is the point. A hand-written list drifts from the contract
   * silently — a new code with no fixture would simply never appear here — and a
   * list that cannot drift turns "we added a code" into a failing test until
   * somebody either writes the fixture or admits the gap below.
   */
  // Annotated, so the compiler checks that the table really is the code union —
  // a table member that drifted out of `ViolationCode` would fail here rather
  // than quietly widening this list to `string`.
  const CODES: readonly ViolationCode[] = Object.values(VIOLATION);

  const FORMS: readonly string[] = [
    ...CODES,
    /** Not a code but a property of the ADDRESS: a violation reported at `sources[1].resource`. */
    'per-entry',
    /** Not a code yet. The Core reports it, and it gets a shape in the same change as its fixture. */
    'unparseable-frontmatter',
  ].sort();

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
    /**
     * The last one, and the only form with no code of its own.
     *
     * `frontmatter.ts` records why it cannot simply reuse "absent": a broken
     * block read as absent would make a `frontmatter: forbidden` rule PASS on
     * it, and a silent false negative is the one bug a trust tool cannot have.
     * The Core reports it as its own fault variant, and it gets a code in the
     * same change as its fixture.
     */
    'unparseable-frontmatter',
  ];

  function produced(): ReadonlySet<string> {
    const forms = checked().files.flatMap((file) =>
      file.violations.flatMap((entry) => [entry.violation, ...(entry.field?.includes('[') ? ['per-entry'] : [])]),
    );
    return new Set(forms);
  }

  it('names the clauses no fixture file exercises', () => {
    expect([...produced()].sort()).toEqual(FORMS.filter((form) => !UNCOVERED.includes(form)));
    expect(UNCOVERED).toHaveLength(1);
  });

  it.each(FORMS.filter((form) => !UNCOVERED.includes(form)))('produces the %s form', (form) => {
    expect(produced()).toContain(form);
  });
});
