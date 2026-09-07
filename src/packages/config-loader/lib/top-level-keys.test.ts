// Colocated unit test for top-level key recognition.
//
// Only the top tier is this Package's business: a key inside `frontmatter:`
// belongs to the Module that owns that section, so nothing below the first
// level is asserted here.

import { describe, expect, it } from 'vitest';
import { findUnrecognisedTopLevelKeys } from './top-level-keys.pure';

describe('findUnrecognisedTopLevelKeys', () => {
  describe('success cases', () => {
    it('accepts a document holding only the module section', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [] } };
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('reports a key the vocabulary does not define', () => {
      // ARRANGE
      const document = { backmatter: {} };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'backmatter' }];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every unrecognised key rather than the first', () => {
      // A config fails whole, so one fault per offending key.
      // ARRANGE
      const document = { backmatter: {}, sidematter: {} };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'backmatter' },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'sidematter' },
      ];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document);
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
      const actual = findUnrecognisedTopLevelKeys(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('finds nothing to reject in an empty mapping', () => {
      // An absent module section is an empty rule list, which the Module owning
      // that section reports — not an unrecognised key.
      // ARRANGE
      const document = {};
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});
