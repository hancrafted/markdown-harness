// Colocated unit test for selector-faults.pure.ts.

import { describe, expect, it } from 'vitest';
import { validateRuleSelector } from './selector-faults.pure.ts';

const AT = 'frontmatter.rules[0]';

describe('validateRuleSelector', () => {
  describe('success cases', () => {
    it('accepts valid folders, folderTrees, and fileNames', () => {
      // ARRANGE
      const rule = {
        folders: ['docs/'],
        folderTrees: ['docs/vision/'],
        fileNames: ['index.md'],
      };
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual([]);
    });

    it('accepts valid excludeFiles selector objects', () => {
      // ARRANGE
      const rule = {
        folderTrees: ['docs/'],
        excludeFiles: [
          { folders: ['docs/okf/'], fileNames: ['SPEC-v0.2.md'] },
          { folderTrees: ['docs/workshop/'], fileNames: ['raw.md'] },
        ],
      };
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('reports CONFIG_SELECTOR_MISSING when rule carries none of the three keys', () => {
      // ARRANGE
      const rule = { intent: 'test' };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: AT }];
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_INVALID_VALUE when a folder token lacks trailing slash', () => {
      // ARRANGE
      const rule = { folders: ['docs'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folders` }];
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_INVALID_VALUE when a wildcard is present in a token', () => {
      // ARRANGE
      const rule = { folderTrees: ['docs/**/*.md'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folderTrees` }];
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_SELECTOR_MISSING when an excludeFiles entry has no selector keys', () => {
      // ARRANGE
      const rule = {
        folderTrees: ['docs/'],
        excludeFiles: [{}],
      };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: `${AT}.excludeFiles[0]` }];
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports CONFIG_INVALID_VALUE when a fileName token contains a slash', () => {
      // ARRANGE
      const rule = { fileNames: ['docs/file.md'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.fileNames` }];
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_UNRECOGNISED_KEY for unknown keys in excludeFiles', () => {
      // ARRANGE
      const rule = {
        folderTrees: ['docs/'],
        excludeFiles: [{ folders: ['docs/'], unrecognised: true }],
      };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.excludeFiles[0].unrecognised` }];
      // ACT
      const faults = validateRuleSelector(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });
  });
});
