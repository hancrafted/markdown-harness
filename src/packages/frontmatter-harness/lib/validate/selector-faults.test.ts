// Colocated unit test for selector-faults.pure.ts.

import { describe, expect, it } from 'vitest';
import { exclusionFaults, selectorFaults, tokenFaults } from './selector-faults.pure.ts';

const AT = 'frontmatter.rules[0]';
const EXCLUDE_AT = `${AT}.excludeFiles`;

describe('selector-faults', () => {
  describe('success cases', () => {
    it('accepts a rule carrying folders, fileNames, or both axes', () => {
      // ARRANGE
      const folderRule = { folders: ['docs/'] };
      const fileRule = { fileNames: ['index.md'] };
      const bothRule = { folders: ['docs/'], fileNames: ['index.md'] };
      // ACT
      const folderFaults = selectorFaults(folderRule, AT);
      const fileFaults = selectorFaults(fileRule, AT);
      const bothFaults = selectorFaults(bothRule, AT);
      // ASSERT
      expect(folderFaults).toEqual([]);
      expect(fileFaults).toEqual([]);
      expect(bothFaults).toEqual([]);
    });

    it('accepts well-formed folder and file-name tokens', () => {
      // ARRANGE
      const selector = {
        folders: ['docs/', './', 'src/packages/'],
        fileNames: ['index.md', 'README.md'],
      };
      // ACT
      const faults = tokenFaults(selector, AT);
      // ASSERT
      expect(faults).toEqual([]);
    });

    it('accepts sound excludeFiles selector objects', () => {
      // ARRANGE
      const rule = {
        excludeFiles: [
          { folders: ['docs/vendor/'] },
          { fileNames: ['draft.md'] },
          { folders: ['docs/api/'], fileNames: ['private.md'] },
        ],
      };
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual([]);
    });

    it('returns no faults when excludeFiles is absent or empty', () => {
      // ARRANGE
      const absentRule = {};
      const emptyRule = { excludeFiles: [] };
      // ACT
      const absentFaults = exclusionFaults(absentRule, AT);
      const emptyFaults = exclusionFaults(emptyRule, AT);
      // ASSERT
      expect(absentFaults).toEqual([]);
      expect(emptyFaults).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('reports CONFIG_SELECTOR_MISSING when neither axis is present on a rule', () => {
      // ARRANGE
      const rule = { intent: 'test' };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: AT }];
      // ACT
      const faults = selectorFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_INVALID_VALUE when a folder token lacks trailing slash or starts with slash', () => {
      // ARRANGE
      const noSlash = { folders: ['docs'] };
      const leadingSlash = { folders: ['/docs/'] };
      const doubleSlash = { folders: ['docs//vision/'] };
      const decoratedNonRoot = { folders: ['./docs/'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.folders` }];
      // ACT
      const noSlashFaults = tokenFaults(noSlash, AT);
      const leadingSlashFaults = tokenFaults(leadingSlash, AT);
      const doubleSlashFaults = tokenFaults(doubleSlash, AT);
      const decoratedNonRootFaults = tokenFaults(decoratedNonRoot, AT);
      // ASSERT
      expect(noSlashFaults).toEqual(expected);
      expect(leadingSlashFaults).toEqual(expected);
      expect(doubleSlashFaults).toEqual(expected);
      expect(decoratedNonRootFaults).toEqual(expected);
    });

    it('reports CONFIG_INVALID_VALUE when a fileName token is a path, directory entry, or empty', () => {
      // ARRANGE
      const slash = { fileNames: ['docs/file.md'] };
      const currentDirectory = { fileNames: ['.'] };
      const parentDirectory = { fileNames: ['..'] };
      const empty = { fileNames: [''] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.fileNames` }];
      // ACT
      const slashFaults = tokenFaults(slash, AT);
      const currentDirectoryFaults = tokenFaults(currentDirectory, AT);
      const parentDirectoryFaults = tokenFaults(parentDirectory, AT);
      const emptyFaults = tokenFaults(empty, AT);
      // ASSERT
      expect(slashFaults).toEqual(expected);
      expect(currentDirectoryFaults).toEqual(expected);
      expect(parentDirectoryFaults).toEqual(expected);
      expect(emptyFaults).toEqual(expected);
    });

    it('reports CONFIG_INVALID_VALUE when excludeFiles is not a list of mappings', () => {
      // ARRANGE
      const nonArray = { excludeFiles: 'docs/' };
      const nonMappingArray = { excludeFiles: ['docs/'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: EXCLUDE_AT }];
      // ACT
      const nonArrayFaults = exclusionFaults(nonArray, AT);
      const nonMappingFaults = exclusionFaults(nonMappingArray, AT);
      // ASSERT
      expect(nonArrayFaults).toEqual(expected);
      expect(nonMappingFaults).toEqual(expected);
    });

    it('reports CONFIG_INVALID_VALUE when an exclusion axis is not a string list', () => {
      // ARRANGE
      const rule = { excludeFiles: [{ folders: 'docs/' }] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: EXCLUDE_AT }];
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_SELECTOR_MISSING when an exclusion carries neither axis', () => {
      // ARRANGE
      const rule = { excludeFiles: [{}] };
      const expected = [{ code: 'CONFIG_SELECTOR_MISSING', location: EXCLUDE_AT }];
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_INVALID_VALUE when an exclusion holds malformed tokens', () => {
      // ARRANGE
      const rule = { excludeFiles: [{ folders: ['docs'] }] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: EXCLUDE_AT }];
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports CONFIG_UNRECOGNISED_KEY by name when an exclusion defines an unrecognised key', () => {
      // ARRANGE
      const rule = {
        excludeFiles: [{ folders: ['docs/'], filenames: ['exempt.md'] }],
      };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${EXCLUDE_AT}.filenames` }];
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports only CONFIG_UNRECOGNISED_KEY when an exclusion carries solely an unrecognised key', () => {
      // ARRANGE
      const rule = {
        excludeFiles: [{ filenames: ['standalone.md'] }],
      };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${EXCLUDE_AT}.filenames` }];
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('accepts an empty axis as selecting nothing without reporting CONFIG_SELECTOR_MISSING', () => {
      // An empty axis selects nothing rather than everything, and does not report
      // CONFIG_SELECTOR_MISSING.
      // ARRANGE
      const rule = { folders: [] };
      // ACT
      const faults = selectorFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual([]);
    });

    it('accepts root folder token ./ without reporting an invalid value', () => {
      // ARRANGE
      const selector = { folders: ['./'] };
      // ACT
      const faults = tokenFaults(selector, AT);
      // ASSERT
      expect(faults).toEqual([]);
    });

    it('deduplicates the same unrecognised key across multiple exclusions into one fault', () => {
      // ARRANGE
      const rule = {
        excludeFiles: [
          { folders: ['docs/'], filenames: ['a.md'] },
          { folders: ['src/'], filenames: ['b.md'] },
        ],
      };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${EXCLUDE_AT}.filenames` }];
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('reports multiple distinct unrecognised keys across exclusions in encounter order', () => {
      // ARRANGE
      const rule = {
        excludeFiles: [
          { folders: ['docs/'], filenames: ['a.md'], typo: true },
          { folders: ['src/'], extra: 123 },
        ],
      };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${EXCLUDE_AT}.filenames` },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${EXCLUDE_AT}.typo` },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${EXCLUDE_AT}.extra` },
      ];
      // ACT
      const faults = exclusionFaults(rule, AT);
      // ASSERT
      expect(faults).toEqual(expected);
    });

    it('ignores keys outside selector axes when evaluating tokenFaults', () => {
      // ARRANGE
      const nonAxisKeys = { intent: 'testing', ruleId: 'r1' };
      // ACT
      const faults = tokenFaults(nonAxisKeys, AT);
      // ASSERT
      expect(faults).toEqual([]);
    });
  });
});
