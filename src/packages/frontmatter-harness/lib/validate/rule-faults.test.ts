// Colocated unit test for validating one rule.
//
// Two of this file's assertions are named on the ticket: a missing rule intent
// points at the rule object rather than at the absent key, because there is no
// key to point at.

import { describe, expect, it } from 'vitest';
import { ruleFaults } from './rule-faults.pure.ts';

const AT = 'frontmatter.rules[0]';

/**
 * No Module-wide `assess:` block. Every case in this file is about one rule on
 * its own, so the effective prompt is whatever the rule itself wrote.
 */
const NO_MODULE_ASSESS = undefined;
const sound = { ruleId: 'research', intent: 'Research notes cite what they drew on', folderTrees: ['docs/'] };

describe('ruleFaults', () => {
  describe('success cases', () => {
    it('accepts a sound rule', () => {
      // ARRANGE
      const rule = sound;
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a frontmatter-forbidden rule carrying no payload', () => {
      // ARRANGE
      const rule = {
        ruleId: 'plain',
        intent: 'Plain docs carry none',
        folderTrees: ['docs/plain/'],
        frontmatter: 'forbidden',
      };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a fileNames selector in place of a folder tree', () => {
      // ARRANGE
      const rule = { ruleId: 'log-files', intent: 'A log says when', fileNames: ['log.md'] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts both spellings of unknownKeys', () => {
      // ARRANGE
      const rules = [
        { ...sound, unknownKeys: 'allowed' },
        { ...sound, unknownKeys: 'forbidden' },
      ];
      // ACT
      const actual = rules.flatMap((r) => ruleFaults(r, AT, NO_MODULE_ASSESS));
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('points a missing rule intent at the rule object', () => {
      // There is no `intent` key to point at, so the address is the rule.
      // ARRANGE
      const rule = { ruleId: 'r', folderTrees: ['docs/'] };
      const expected = [{ code: 'CONFIG_MISSING_RULE_INTENT', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a rule with neither selector', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i' };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a rule carrying wildcards in a selector token', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', folderTrees: ['docs/**'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folderTrees` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports frontmatter-forbidden beside a payload key', () => {
      // ARRANGE
      const rule = {
        ruleId: 'r',
        intent: 'i',
        folderTrees: ['docs/'],
        frontmatter: 'forbidden',
        unknownKeys: 'forbidden',
      };
      const expected = [{ code: 'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a missing ruleId as an invalid value at its address', () => {
      // ARRANGE
      const rule = { intent: 'i', folderTrees: ['docs/'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.ruleId` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an unknownKeys outside allowed and forbidden', () => {
      // The evaluator branches on `forbidden` alone, so any other spelling
      // silently reads as the permissive default.
      // ARRANGE
      const rule = { ...sound, unknownKeys: 'sometimes' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.unknownKeys` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a folderTrees list holding a non-string element', () => {
      // ARRANGE
      const rule = { ...sound, folderTrees: ['docs/', 3] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folderTrees` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('separates an empty intent from an absent one', () => {
      // Written-and-blank is its own code, and points at the key that was written.
      // ARRANGE
      const rule = { ruleId: 'r', intent: '', folderTrees: ['docs/'] };
      const expected = [{ code: 'CONFIG_EMPTY_INTENT', location: `${AT}.intent` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a folderTrees that is not a list', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', folderTrees: 'docs/' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folderTrees` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches into fields and reports the constraint address', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', folderTrees: ['docs/'], fields: { slug: {} } };
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: `${AT}.fields.slug` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a key the rule vocabulary does not define', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', folderTrees: ['docs/'], excludeFile: [] };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.excludeFile` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('points a wrong-typed element at the key rather than at its index', () => {
      // §3.5 fixes the location as the key as written.
      // ARRANGE
      const rule = { ...sound, anyOf: [true, false] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.anyOf` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts an empty excludeFiles list', () => {
      // ARRANGE
      const rule = { ...sound, excludeFiles: [] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});
