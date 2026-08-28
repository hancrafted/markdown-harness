// The Module in isolation: a rule payload and a plain mapping in, violations
// out. No files, no globs, no YAML — which makes this the fastest place to pin
// the constraint families and the formats, and the only place some of them can
// be reached at all, because no fixture file fails them.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../contract/config.ts';
import { VIOLATION } from '../../contract/violation-code.ts';
import { evaluate } from '../evaluate.ts';

describe('one presence clause, three outcomes', () => {
  // THE DEFECT THIS SPLIT EXISTS FOR. Every one of these three used to report
  // `constraint: 'presence'`, so a consumer could not tell whether to ADD the
  // field or DELETE it without comparing the requirement against the value
  // itself. The fix for the first two is the reverse of the fix for the third.
  const required: FrontmatterRule = {
    ruleId: 'plain',
    path: ['docs/plain/**/*.md'],
    intent: 'Everything under plain/ still has to say what it is',
    fields: { type: { presence: 'required' } },
  };

  it('names an absent field MISSING, and carries no value at all', () => {
    // No `value` key, rather than `value: null`: nothing was there, and a null
    // would claim the key existed and held nothing.
    expect(evaluate(required, {})).toEqual([
      { field: 'type', violation: VIOLATION.MISSING_REQUIRED_FIELD, requirement: { presence: 'required' } },
    ]);
  });

  it.each([
    ['a bare key — the YAML trap', null, null],
    ['an empty string', '', ''],
    ['an empty list', [], { items: 0 }],
    ['an empty mapping', {}, { keys: [] }],
  ])('names a written-but-empty field EMPTY: %s', (_case, written, reported) => {
    // A DIFFERENT MISTAKE with a different fix: the author believes they filled
    // it in. Tenet 7 pays for keeping these four apart from "you never wrote
    // the key" — collapsing them would send an agent to the wrong repair.
    expect(evaluate(required, { type: written })).toEqual([
      {
        field: 'type',
        value: reported,
        violation: VIOLATION.EMPTY_REQUIRED_FIELD,
        requirement: { presence: 'required' },
      },
    ]);
  });

  it('names a present-but-forbidden field FORBIDDEN, so the fix reads as deletion', () => {
    const forbidden: FrontmatterRule = {
      ruleId: 'reference',
      path: ['docs/reference/**/*.md'],
      intent: 'Reference material ships finished or not at all',
      fields: { draft: { presence: 'forbidden' } },
    };

    expect(evaluate(forbidden, { draft: true })).toEqual([
      {
        field: 'draft',
        value: true,
        violation: VIOLATION.FORBIDDEN_FIELD_PRESENT,
        requirement: { presence: 'forbidden' },
      },
    ]);
  });
});

describe('a failed membership check renders whatever the config gave it', () => {
  it('carries an allowed record that omitted its intent, as null', () => {
    // `intent` is optional on an allowed value, and the fixture config exercises
    // its absence on purpose. The data must not put words in the config's mouth,
    // so the absence travels as `null` rather than as an invented sentence.
    const rule: FrontmatterRule = {
      ruleId: 'skills',
      path: ['docs/skills/**/SKILL.md'],
      intent: 'A skill is addressed by exactly one of its two names',
      fields: { type: { presence: 'required', allowed: [{ value: 'skill' }] } },
    };

    expect(evaluate(rule, { type: 'workflow' })).toEqual([
      {
        field: 'type',
        // Direct, not `{ kind: 'scalar', value: 'workflow' }`. The tag was
        // charged on every violation to insure against a container the corpus
        // does not contain.
        value: 'workflow',
        violation: VIOLATION.VALUE_NOT_ALLOWED,
        // Verbatim, so the record that omitted its `intent` arrives exactly as
        // the config wrote it — no invented sentence, and no normalising `intent`
        // to null either. The absence IS the config's own text.
        requirement: { presence: 'required', allowed: [{ value: 'skill' }] },
      },
    ]);
  });
});

describe('an address reaches one level into a nested shape', () => {
  const rule: FrontmatterRule = {
    ruleId: 'provenance-exemplar',
    path: ['docs/research/provenance.md'],
    intent: 'The one document that records its own provenance in full',
    fields: {
      'generated.by': { presence: 'required', format: 'actor' },
      'generated.at': { presence: 'required', format: 'datetime' },
      'sources[].resource': { presence: 'required', format: 'uri' },
      'verified[].at': { format: 'datetime' },
    },
  };

  const conforming = {
    generated: { by: 'claude-opus/5', at: '2026-08-25T09:00:00Z' },
    sources: [{ resource: 'docs/okf/SPEC-v0.2.md' }, { resource: 'https://www.rfc-editor.org/rfc/rfc8820' }],
    verified: [{ at: '2026-08-25T11:30:00Z' }],
  };

  it('is satisfied by the exemplar values', () => {
    expect(evaluate(rule, conforming)).toEqual([]);
  });

  it('reaches a key inside a mapping', () => {
    const violations = evaluate(rule, { ...conforming, generated: { by: 'not an actor', at: 'yesterday' } });

    expect(violations.map((entry) => [entry.violation, entry.field])).toEqual([
      [VIOLATION.FORMAT_MISMATCH, 'generated.at'],
      [VIOLATION.FORMAT_MISMATCH, 'generated.by'],
    ]);
  });

  it('reaches a key inside EVERY entry of a list, and resolves the index', () => {
    // `sources[].resource` over a two-entry list is two instances. The report
    // says `sources[1]`, not `sources[]` — which is also why no violation
    // carries a line number: for a list entry the instance address locates the
    // fault better than a number does.
    const broken = { ...conforming, sources: [{ resource: 'docs/ok.md' }, { resource: 'has a space' }] };

    expect(evaluate(rule, broken).map((entry) => [entry.violation, entry.field])).toEqual([
      [VIOLATION.FORMAT_MISMATCH, 'sources[1].resource'],
    ]);
  });

  it('checks every entry of a list independently', () => {
    const broken = { ...conforming, verified: [{ at: '2026-08-25T11:30:00Z' }, { at: 'soon' }, { at: 'also soon' }] };

    expect(evaluate(rule, broken).map((entry) => entry.field)).toEqual(['verified[1].at', 'verified[2].at']);
  });

  // A document with NO frontmatter block at all is `null`, not `{}` — and 13 of
  // the 14 files this repo's own config finds at fault are exactly that, which
  // is why these two cases were reachable long before anything read them back.
  const named: FrontmatterRule = {
    ruleId: 'provenance-exemplar',
    path: ['docs/research/provenance.md'],
    intent: 'The one document that records its own provenance in full',
    fields: { type: { presence: 'required' }, ...rule.fields },
  };

  it('demands the top-level field of a document with no frontmatter, and nothing nested', () => {
    // A nested address over an absent container reaches NOTHING to report. The
    // alternative is a violation at the literal `sources[].resource`, brackets
    // unresolved — the one thing this file's own header says a report may never
    // say, because it does not tell the Contributor which entry to fix. It also
    // demands a key of a list entry that does not exist, which no repair can do.
    expect(evaluate(named, null).map((entry) => [entry.violation, entry.field])).toEqual([
      [VIOLATION.MISSING_REQUIRED_FIELD, 'type'],
    ]);
  });

  it('answers an absent block exactly as it answers a block whose keys are absent', () => {
    // The claim in one line: `generated` is missing either way, so the two
    // states are the same state and one report covers both.
    expect(evaluate(named, null)).toEqual(evaluate(named, {}));
  });

  it('resolves the index of an entry that exists but omits the key', () => {
    // The presence gate reaching into a list, which is the arm config B leans
    // on: the list stays optional, but an entry that exists says who. The
    // address has to name WHICH entry.
    const trust: FrontmatterRule = {
      ruleId: 'provenance-exemplar',
      path: ['docs/research/provenance.md'],
      intent: 'An entry that exists says who verified it',
      fields: { 'verified[].by': { presence: 'required', format: 'actor' } },
    };

    expect(
      evaluate(trust, { verified: [{ at: '2026-08-25T11:30:00Z' }] }).map((entry) => [entry.violation, entry.field]),
    ).toEqual([[VIOLATION.MISSING_REQUIRED_FIELD, 'verified[0].by']]);
  });
});

describe('format: actor reserves human and process as producer names', () => {
  const rule: FrontmatterRule = {
    ruleId: 'provenance-exemplar',
    path: ['docs/research/provenance.md'],
    intent: 'The one document that records its own provenance in full',
    fields: { 'generated.by': { format: 'actor' } },
  };

  function accepts(value: string): boolean {
    return evaluate(rule, { generated: { by: value } }).length === 0;
  }

  /** [value, accepted, what the row pins] */
  const TABLE: readonly [string, boolean, string][] = [
    ['claude-opus/5', true, 'producer/version, the first arm'],
    ['human:hancrafted', true, 'the human prefix — the arm a consumer derives trust from'],
    ['process:nightly-index', true, 'the process prefix'],
    [
      'human/hancrafted',
      false,
      'THE ROW THIS TABLE EXISTS FOR. Read as a naive three-way alternation, a slash where a colon ' +
        'belongs satisfies arm 1 as producer `human`, version `hancrafted` — and ' +
        'fixtures/docs/research/bad-actor.md, whose entire stated purpose is being a malformed ' +
        'Actor, stops proving anything. So `human` and `process` are RESERVED producer names.',
    ],
    ['process/nightly', false, 'the same trap on the other prefix'],
    ['hancrafted', false, 'a bare identifier is none of the three forms'],
    ['human:', false, 'a prefix with no identity after it'],
    ['claude-opus/5/beta', false, 'the producer arm takes exactly one slash'],
    ['claude opus/5', false, 'no whitespace in any arm'],
  ];

  it.each(TABLE)('%s → accepted: %s', (value, expected) => {
    expect(accepts(value)).toBe(expected);
  });
});
