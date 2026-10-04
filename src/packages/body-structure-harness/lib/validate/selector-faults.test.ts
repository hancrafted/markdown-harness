// Colocated unit test for the selector half of one Rule: Core's two literal
// axes, this Module's `types` axis, and the exclusions (design-ADR 0016).

import { describe, expect, it } from 'vitest';
import { axisFaults, exclusionFaults, selectorMissingFaults } from './selector-faults.pure.ts';

const AT = 'body-structure.rules[0]';

describe('selector faults', () => {
  describe('success cases', () => {
    it('finds nothing in well-formed axes and exclusions', () => {
      // ARRANGE
      const rule = {
        folders: ['docs/research/', './'],
        fileNames: ['index.md'],
        types: ['research', 'note'],
        excludeFiles: [{ fileNames: ['scratch.md'] }],
      };
      const expected = { missing: [], axes: [], exclusions: [] };
      // ACT
      const actual = {
        missing: selectorMissingFaults(rule, AT),
        axes: axisFaults(rule, AT),
        exclusions: exclusionFaults(rule, AT),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts types alone as a selector', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = selectorMissingFaults({ types: ['guide'] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a Rule carrying none of the three axes', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: AT }];
      // ACT
      const actual = selectorMissingFaults({ ruleId: 'nowhere' }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a folder token without its slash and a types list holding an empty string, at the axis', () => {
      // ARRANGE
      const rule = { folders: ['docs'], fileNames: ['a/b.md'], types: ['research', ''] };
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.folders` },
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.fileNames` },
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.types` },
      ];
      // ACT
      const actual = axisFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an exclusion with an unrecognised key, or with no axis at all', () => {
      // ARRANGE
      const expected = [
        [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.excludeFiles.types` }],
        [{ code: 'CONFIG_SELECTOR_MISSING', location: `${AT}.excludeFiles` }],
      ];
      // ACT
      const actual = [
        exclusionFaults({ excludeFiles: [{ types: ['draft'] }] }, AT),
        exclusionFaults({ excludeFiles: [{}] }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses an axis that is not a list of strings once, at the axis', () => {
      // ARRANGE
      const rule = { folders: 'docs/', types: [7] };
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.folders` },
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.types` },
      ];
      // ACT
      const actual = axisFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an exclusion list that is not a list of mappings, or carries a malformed token', () => {
      // ARRANGE
      const expected = [
        [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.excludeFiles` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.excludeFiles` }],
      ];
      // ACT
      const actual = [
        exclusionFaults({ excludeFiles: ['scratch.md'] }, AT),
        exclusionFaults({ excludeFiles: [{ folders: ['docs'] }] }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
