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
