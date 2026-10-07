// Colocated unit test for the closure over tested carriers. Each guard is shown
// red against a config built to break it: a deleted declaration, a declared
// carrier that resolves to nothing, a placeholder outside any carrier.

import { describe, expect, it } from 'vitest';
import { carrierClosure, placeholdersIn } from './carrier-closure.pure.ts';

const FIRST = 'FINDINGS_CLAUSE_PLACEHOLDER';
const SECOND = 'FRONT_CLAUSE_PLACEHOLDER';

const CONFIG = `
body-structure:
  rules:
    - ruleId: research
      intent: 'Opens with a title.'
      headings:
        - { purpose: heading, level: 2, intent: 'Findings. ${FIRST}' }
frontmatter:
  rules:
    - ruleId: research
      intent: 'Says what it is. ${SECOND}'
`;

describe('carrierClosure', () => {
  describe('success cases', () => {
    it('is closed when every placeholder is declared and every declared one resolves to one carrier', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = carrierClosure(CONFIG, [FIRST, SECOND]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists the distinct placeholders the config holds in its carriers, evaluated from the YAML', () => {
      // ARRANGE
      const expected = [SECOND, FIRST].sort();
      // ACT
      const actual = placeholdersIn(CONFIG);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('goes red when a declaration is deleted: the config placeholder is left undeclared', () => {
      // ARRANGE
      const expected =
        /FRONT_CLAUSE_PLACEHOLDER is in frontmatter\.rules\[ruleId=research\]\.intent and no case declares it/;
      // ACT
      const actual = carrierClosure(CONFIG, [FIRST]).join('\n');
      // ASSERT
      expect(actual).toMatch(expected);
    });

    it('goes red when a declared placeholder resolves to no carrier', () => {
      // ARRANGE
      const expected = ['declared placeholder GONE_CLAUSE_PLACEHOLDER is in no intent carrier'];
      // ACT
      const actual = carrierClosure(CONFIG, [FIRST, SECOND, 'GONE_CLAUSE_PLACEHOLDER']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('goes red when a placeholder sits in a string that is not an intent carrier', () => {
      // ARRANGE
      const config = `${CONFIG}notes:\n  text: ${FIRST}\n`;
      const expected = /placeholder FINDINGS_CLAUSE_PLACEHOLDER sits in a string that is not an intent carrier/;
      // ACT
      const actual = carrierClosure(config, [FIRST, SECOND]).join('\n');
      // ASSERT
      expect(actual).toMatch(expected);
    });
  });

  describe('edge cases', () => {
    it('goes red when one placeholder is in two carriers, since its steering marker would occur twice', () => {
      // ARRANGE
      const config = CONFIG.replace('Says what it is.', `Says what it is. ${FIRST}`);
      const expected = /FINDINGS_CLAUSE_PLACEHOLDER is in 2 carriers/;
      // ACT
      const actual = carrierClosure(config, [FIRST, SECOND]).join('\n');
      // ASSERT
      expect(actual).toMatch(expected);
    });

    it('goes red when one declared placeholder contains another, since substitution would corrupt it', () => {
      // ARRANGE
      const longer = `${FIRST}_EXTRA`;
      const config = CONFIG.replace('Says what it is.', `Says what it is. ${longer}`);
      const expected = /contains declared placeholder/;
      // ACT
      const actual = carrierClosure(config, [FIRST, SECOND, longer]).join('\n');
      // ASSERT
      expect(actual).toMatch(expected);
    });

    it('reads a config with no placeholder as closed over nothing', () => {
      // ARRANGE
      const config = 'a:\n  intent: plain\n';
      // ACT
      const actual = [carrierClosure(config, []), placeholdersIn(config)];
      // ASSERT
      expect(actual).toEqual([[], []]);
    });
  });
});
