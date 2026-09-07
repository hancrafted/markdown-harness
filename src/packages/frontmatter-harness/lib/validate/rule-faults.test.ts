// Colocated unit test for validating one rule.
//
// Two of this file's assertions are named on the ticket: a missing rule intent
// points at the rule object rather than at the absent key, because there is no
// key to point at.

import { describe, expect, it } from 'vitest';
import { ruleFaults } from './rule-faults.pure';

const AT = 'frontmatter.rules[0]';
const sound = { ruleId: 'research', intent: 'Research notes cite what they drew on', path: ['docs/**'] };

describe('ruleFaults', () => {
  describe('success cases', () => {
    it('accepts a sound rule', () => {
      // ARRANGE
      const rule = sound;
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a frontmatter-forbidden rule carrying no payload', () => {
      // ARRANGE
      const rule = {
        ruleId: 'plain',
        intent: 'Plain docs carry none',
        path: ['docs/plain/**'],
        frontmatter: 'forbidden',
      };
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a fileName selector in place of a path list', () => {
      // ARRANGE
      const rule = { ruleId: 'log-files', intent: 'A log says when', fileName: 'log.md' };
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('points a missing rule intent at the rule object', () => {
      // There is no `intent` key to point at, so the address is the rule.
      // ARRANGE
      const rule = { ruleId: 'r', path: ['docs/**'] };
      const expected = [{ code: 'CONFIG_MISSING_RULE_INTENT', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a rule with neither selector', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i' };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a rule carrying both selectors', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', path: ['docs/**'], fileName: 'log.md' };
      const expected = [{ code: 'CONFIG_SELECTOR_AMBIGUOUS', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports frontmatter-forbidden beside a payload key', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', path: ['docs/**'], frontmatter: 'forbidden', unknownKeys: 'forbidden' };
      const expected = [{ code: 'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a missing ruleId as an invalid value at its address', () => {
      // ARRANGE
      const rule = { intent: 'i', path: ['docs/**'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.ruleId` }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('separates an empty intent from an absent one', () => {
      // Written-and-blank is its own code, and points at the key that was written.
      // ARRANGE
      const rule = { ruleId: 'r', intent: '', path: ['docs/**'] };
      const expected = [{ code: 'CONFIG_EMPTY_INTENT', location: `${AT}.intent` }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a path list that is not a list', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', path: 'docs/**' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.path` }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches into fields and reports the constraint address', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', path: ['docs/**'], fields: { slug: {} } };
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: `${AT}.fields.slug` }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a key the rule vocabulary does not define', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', path: ['docs/**'], excludeFile: [] };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.excludeFile` }];
      // ACT
      const actual = ruleFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
