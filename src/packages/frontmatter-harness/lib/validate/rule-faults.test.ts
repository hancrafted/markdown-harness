// Colocated unit test for validating one rule.
//
// Two of this file's assertions are named on the ticket: a missing rule intent
// points at the rule object rather than at the absent key, because there is no
// key to point at; and a malformed selector token points at the AXIS rather
// than at the offending index, because one bad token makes the whole axis
// unusable and an indexed fault would ask for the same repair once per element.

import { describe, expect, it } from 'vitest';
import { ruleFaults } from './rule-faults.pure';

const AT = 'frontmatter.rules[0]';

/**
 * No Module-wide `assess:` block. Every case in this file is about one rule on
 * its own, so the effective prompt is whatever the rule itself wrote.
 */
const NO_MODULE_ASSESS = undefined;
const sound = { ruleId: 'research', intent: 'Research notes cite what they drew on', folders: ['docs/'] };

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
        folders: ['docs/plain/'],
        frontmatter: 'forbidden',
      };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a file-name axis in place of a folder axis', () => {
      // ARRANGE
      const rule = { ruleId: 'log-files', intent: 'A log says when', fileNames: ['log.md'] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a rule carrying both axes, which intersects them rather than colliding', () => {
      // ARRANGE
      const rule = { ...sound, fileNames: ['provenance.md'] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts the corpus root as a folder token', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', folders: ['./'] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts an exclusion carrying one axis, on the same terms an include does', () => {
      // ARRANGE
      const rule = { ...sound, excludeFiles: [{ fileNames: ['upstream.md'] }, { folders: ['docs/vendor/'] }] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('points a missing rule intent at the rule object', () => {
      // There is no `intent` key to point at, so the address is the rule.
      // ARRANGE
      const rule = { ruleId: 'r', folders: ['docs/'] };
      const expected = [{ code: 'CONFIG_MISSING_RULE_INTENT', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a rule carrying neither selector axis', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i' };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a folder token written without its trailing separator', () => {
      // ARRANGE
      const rule = { ...sound, folders: ['docs/vision'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folders` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a file name carrying a separator, which is a path rather than a basename', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', fileNames: ['docs/log.md'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.fileNames` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports frontmatter-forbidden beside a payload key', () => {
      // ARRANGE
      const rule = { ...sound, frontmatter: 'forbidden', unknownKeys: 'forbidden' };
      const expected = [{ code: 'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD', location: AT }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a missing ruleId as an invalid value at its address', () => {
      // ARRANGE
      const rule = { intent: 'i', folders: ['docs/'] };
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

    it('rejects a folder axis holding a non-string element', () => {
      // ARRANGE
      const rule = { ...sound, folders: ['docs/', 3] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folders` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an exclusion carrying neither axis, which would exclude the whole corpus', () => {
      // ARRANGE
      const rule = { ...sound, excludeFiles: [{}] };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: `${AT}.excludeFiles` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an exclusion that is not a selector object at all', () => {
      // ARRANGE
      const rule = { ...sound, excludeFiles: ['docs/research/vendor/**'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.excludeFiles` }];
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
      const rule = { ruleId: 'r', intent: '', folders: ['docs/'] };
      const expected = [{ code: 'CONFIG_EMPTY_INTENT', location: `${AT}.intent` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a folder axis that is not a list', () => {
      // ARRANGE
      const rule = { ruleId: 'r', intent: 'i', folders: 'docs/' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folders` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches into fields and reports the constraint address', () => {
      // ARRANGE
      const rule = { ...sound, fields: { slug: {} } };
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: `${AT}.fields.slug` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a key the rule vocabulary does not define', () => {
      // ARRANGE
      // `path` is one of them now: the old selector keys are RETIRED rather
      // than redefined, so a config written in the old grammar is told which
      // key stopped existing instead of being read with half its rules silent.
      const rule = { ...sound, path: ['docs/**/*.md'] };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.path` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('points a wrong-typed element at the key rather than at its index', () => {
      // §3.5 fixes the location as the key as written. One bad element makes
      // the whole set unusable, so an indexed fault would ask for the same
      // repair once per element.
      // ARRANGE
      const rule = { ...sound, anyOf: [true, false] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.anyOf` }];
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports one fault for an axis holding several malformed tokens', () => {
      // ARRANGE
      const rule = { ...sound, folders: ['docs/vision', 'docs/okf'] };
      const one = 1;
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toHaveLength(one);
    });

    it('accepts an empty exclusion list, which names nothing rather than something wrong', () => {
      // ARRANGE
      const rule = { ...sound, excludeFiles: [] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts an empty axis, which selects nothing rather than everything', () => {
      // ARRANGE
      // An empty list is a list. It names no folders, which is a different
      // thing from naming a wrong one — and a different thing again from
      // leaving the axis out, which means every.
      const rule = { ruleId: 'r', intent: 'i', folders: [] };
      // ACT
      const actual = ruleFaults(rule, AT, NO_MODULE_ASSESS);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});
