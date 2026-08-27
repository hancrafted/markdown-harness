// The Module in isolation: a rule payload and a plain mapping in, violations
// out. No files, no globs, no YAML — which makes this the fastest place to pin
// the constraint families and the formats, and the only place some of them can
// be reached at all, because no fixture file fails them.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../contract/config.ts';
import { evaluate } from '../evaluate.ts';

describe('a failed membership check renders whatever the config gave it', () => {
  it('carries an allowed record that omitted its intent, as null', () => {
    // `intent` is optional on an allowed value, and the fixture config exercises
    // its absence on purpose. The data must not put words in the config's mouth,
    // so the absence travels as `null` rather than as an invented sentence.
    const rule: FrontmatterRule = {
      path: ['docs/skills/**/SKILL.md'],
      intent: 'A skill is addressed by exactly one of its two names',
      fields: { type: { presence: 'required', allowed: [{ value: 'skill' }] } },
    };

    expect(evaluate(rule, { type: 'workflow' })).toEqual([
      {
        constraint: 'allowed',
        at: 'type',
        operand: [{ value: 'skill', intent: null }],
        found: { kind: 'scalar', value: 'workflow' },
        intent: 'A skill is addressed by exactly one of its two names',
      },
    ]);
  });
});

describe('an address reaches one level into a nested shape', () => {
  const rule: FrontmatterRule = {
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

    expect(violations.map((entry) => [entry.constraint, entry.at])).toEqual([
      ['format', 'generated.at'],
      ['format', 'generated.by'],
    ]);
  });

  it('reaches a key inside EVERY entry of a list, and resolves the index', () => {
    // `sources[].resource` over a two-entry list is two instances. The report
    // says `sources[1]`, not `sources[]` — which is also why no violation
    // carries a line number: for a list entry the instance address locates the
    // fault better than a number does.
    const broken = { ...conforming, sources: [{ resource: 'docs/ok.md' }, { resource: 'has a space' }] };

    expect(evaluate(rule, broken).map((entry) => [entry.constraint, entry.at])).toEqual([
      ['format', 'sources[1].resource'],
    ]);
  });

  it('checks every entry of a list independently', () => {
    const broken = { ...conforming, verified: [{ at: '2026-08-25T11:30:00Z' }, { at: 'soon' }, { at: 'also soon' }] };

    expect(evaluate(rule, broken).map((entry) => entry.at)).toEqual(['verified[1].at', 'verified[2].at']);
  });
});

describe('format: actor reserves human and process as producer names', () => {
  const rule: FrontmatterRule = {
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
