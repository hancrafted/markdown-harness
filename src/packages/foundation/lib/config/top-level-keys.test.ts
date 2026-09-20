// Colocated unit test for top-level key recognition.

import { describe, expect, it } from 'vitest';
import type { ModuleDescriptor } from '../../../config-contract/index.ts';
import { checkNoModuleSection, findUnrecognisedTopLevelKeys } from './top-level-keys.pure.ts';

const dummyModule: ModuleDescriptor<unknown> = {
  key: 'frontmatter',
  validateSection: () => ({ faults: [] }),
  claimsFor: () => [],
};
const MODULES = [dummyModule];
const LOCATION = 'markdown-harness.config.yaml';

describe('findUnrecognisedTopLevelKeys', () => {
  describe('success cases', () => {
    it('accepts a document holding only the module section', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [] } };
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, MODULES);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('reports no fault when at least one declared module section is present', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [] } };
      // ACT
      const actual = checkNoModuleSection(document, MODULES, LOCATION);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('reports a key the declared module set does not define', () => {
      // ARRANGE
      const document = { backmatter: {} };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'backmatter' }];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports CONFIG_NO_MODULE_SECTION when no declared module key is present', () => {
      // ARRANGE
      const document = { backmatter: {} };
      const expected = [{ code: 'CONFIG_NO_MODULE_SECTION', location: LOCATION }];
      // ACT
      const actual = checkNoModuleSection(document, MODULES, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every unrecognised key rather than the first', () => {
      // ARRANGE
      const document = { backmatter: {}, sidematter: {} };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'backmatter' },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'sidematter' },
      ];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('leaves a recognised sibling alone', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [] }, typos: {} };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'typos' }];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports CONFIG_NO_MODULE_SECTION on an empty mapping', () => {
      // ARRANGE
      const document = {};
      const expected = [{ code: 'CONFIG_NO_MODULE_SECTION', location: LOCATION }];
      // ACT
      const actual = checkNoModuleSection(document, MODULES, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
