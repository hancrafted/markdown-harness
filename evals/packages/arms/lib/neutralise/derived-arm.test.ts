// Colocated unit test for arm derivation: the steered arm substitutes a generated
// clause for the placeholder, the intent-neutralised arm replaces EVERY carrier
// with one constant filler and changes nothing else.

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { NEUTRAL_FILLER, deriveArm, testedCarrierAddress } from './derived-arm.pure.ts';

const PLACEHOLDER = 'CLAUSE_HERE';
const CLAUSE = 'Write the code QQ11-2222 on its own line.';

const CONFIG = `
body-structure:
  rules:
    - ruleId: research
      folders: [docs/research/]
      intent: 'Research opens with a title. Rule words.'
      headings:
        - { purpose: heading, level: 1 }
        - purpose: heading
          level: 2
          pattern: '^Findings$'
          intent: 'Findings state what was found. ${PLACEHOLDER}'
          headings:
            - { purpose: heading, level: 3, intent: 'Nested words.' }
frontmatter:
  rules:
    - ruleId: research
      folders: [docs/research/]
      intent: 'Frontmatter words.'
      fields:
        type: { presence: required, allowed: [{ value: research, intent: 'Allowed words.' }] }
`;

function derive(arm: 'steered' | 'neutralised') {
  return deriveArm({ configText: CONFIG, arm, substitutes: [{ placeholder: PLACEHOLDER, clause: CLAUSE }] });
}

describe('deriveArm', () => {
  describe('success cases', () => {
    it('replaces every carrier in the document, tested or not, with one constant filler', () => {
      // ARRANGE
      const expected = [NEUTRAL_FILLER, NEUTRAL_FILLER, NEUTRAL_FILLER, NEUTRAL_FILLER, NEUTRAL_FILLER];
      // ACT
      const actual = derive('neutralised').carriers.map((carrier) => carrier.text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('changes nothing but the carriers, so replacement is not removal', () => {
      // ARRANGE
      const original = parse(CONFIG);
      const derived = parse(derive('neutralised').configText);
      const stripped = JSON.stringify(original).replace(/"intent":"[^"]*"/g, '"intent":"-"');
      // ACT
      const actual = JSON.stringify(derived).replace(/"intent":"[^"]*"/g, '"intent":"-"');
      // ASSERT
      expect(actual).toEqual(stripped);
    });

    it('substitutes the clause for the placeholder in the steered arm and leaves the other carriers alone', () => {
      // ARRANGE
      const expected = [
        'Research opens with a title. Rule words.',
        `Findings state what was found. ${CLAUSE}`,
        'Nested words.',
        'Frontmatter words.',
        'Allowed words.',
      ];
      // ACT
      const result = derive('steered');
      // ASSERT
      expect(result.carriers.map((carrier) => carrier.text)).toEqual(expected);
      expect(result.substitutions).toBe(1);
    });

    it('records the characters each arm delivers, never padding the filler to length', () => {
      // ARRANGE
      const expected = 5 * NEUTRAL_FILLER.length;
      // ACT
      const actual = derive('neutralised').charactersDelivered;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a steered derivation whose config holds no placeholder', () => {
      // ARRANGE
      const input = {
        configText: 'a:\n  intent: plain\n',
        arm: 'steered' as const,
        substitutes: [{ placeholder: PLACEHOLDER, clause: CLAUSE }],
      };
      // ACT
      const act = () => deriveArm(input);
      // ASSERT
      expect(act).toThrow(/placeholder/);
    });
  });

  describe('edge cases', () => {
    it('leaves no placeholder behind in either arm', () => {
      // ARRANGE
      const arms = ['steered', 'neutralised'] as const;
      // ACT
      const actual = arms.map((arm) => derive(arm).configText.includes(PLACEHOLDER));
      // ASSERT
      expect(actual).toEqual([false, false]);
    });
  });
});

describe('testedCarrierAddress', () => {
  describe('success cases', () => {
    it('addresses the one carrier that holds the placeholder, nested below its Rule', () => {
      // ARRANGE
      const expected = 'body-structure.rules[ruleId=research].headings[1].intent';
      // ACT
      const actual = testedCarrierAddress(CONFIG, PLACEHOLDER);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('finds nothing when no carrier holds the placeholder', () => {
      // ARRANGE
      const text = 'a:\n  intent: plain\n';
      // ACT
      const actual = testedCarrierAddress(text, PLACEHOLDER);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('ignores a placeholder sitting in a non-carrier string', () => {
      // ARRANGE
      const text = `a:\n  note: ${PLACEHOLDER}\n`;
      // ACT
      const actual = testedCarrierAddress(text, PLACEHOLDER);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });
});

describe('deriveArm with two tested carriers', () => {
  const SECOND_PLACEHOLDER = 'OTHER_SLOT_HERE';
  const SECOND_CLAUSE = 'End the description with RR22-3333.';
  const TWO = CONFIG.replace('Frontmatter words.', `Frontmatter words. ${SECOND_PLACEHOLDER}`);
  const substitutes = [
    { placeholder: PLACEHOLDER, clause: CLAUSE },
    { placeholder: SECOND_PLACEHOLDER, clause: SECOND_CLAUSE },
  ];

  describe('success cases', () => {
    it('substitutes each clause for its own placeholder and counts one carrier string per substitute', () => {
      // ARRANGE
      const expected = [1, 1];
      // ACT
      const result = deriveArm({ configText: TWO, arm: 'steered', substitutes });
      // ASSERT
      expect(result.occurrences).toEqual(expected);
      expect(result.configText).toContain(SECOND_CLAUSE);
      expect(result.configText).toContain(CLAUSE);
    });
  });

  describe('failure cases', () => {
    it('refuses a steered derivation when only one of two placeholders is in the config', () => {
      // ARRANGE
      const act = () => deriveArm({ configText: CONFIG, arm: 'steered', substitutes });
      // ACT
      const expected = /OTHER_SLOT_HERE appears in no carrier/;
      // ASSERT
      expect(act).toThrow(expected);
    });
  });

  describe('edge cases', () => {
    it('replaces every carrier in the intent-neutralised arm and reports no substitution, whatever the substitutes', () => {
      // ARRANGE
      const expected = { substitutions: 0, occurrences: [1, 1] };
      // ACT
      const result = deriveArm({ configText: TWO, arm: 'neutralised', substitutes });
      // ASSERT
      expect({ substitutions: result.substitutions, occurrences: result.occurrences }).toEqual(expected);
    });
  });
});
