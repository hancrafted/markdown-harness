// Colocated unit test for the errno-to-catalog mapping.
//
// Extracted from the read adapter so the mapping can be asserted without a
// filesystem: planting an unreadable file is a permission-dependent setup that
// says nothing about the rule being tested.

import { describe, expect, it } from 'vitest';
import { faultForReadFailure } from './read-fault.pure';

const LOCATION = 'markdown-harness.config.yaml';

describe('faultForReadFailure', () => {
  describe('success cases', () => {
    it('maps a missing entry to CONFIG_NOT_FOUND', () => {
      // ARRANGE
      const missing = 'ENOENT';
      const expected = { code: 'CONFIG_NOT_FOUND', location: LOCATION };
      // ACT
      const actual = faultForReadFailure(missing, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('maps a permission refusal to CONFIG_UNREADABLE', () => {
      // ARRANGE
      const refused = 'EACCES';
      const expected = { code: 'CONFIG_UNREADABLE', location: LOCATION };
      // ACT
      const actual = faultForReadFailure(refused, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('maps a directory read to CONFIG_UNREADABLE', () => {
      // "Something is there but cannot be read as a file" is exactly this case.
      // ARRANGE
      const directory = 'EISDIR';
      const expected = { code: 'CONFIG_UNREADABLE', location: LOCATION };
      // ACT
      const actual = faultForReadFailure(directory, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('treats an absent errno as unreadable rather than missing', () => {
      // Only ENOENT proves absence. Anything the platform declines to name is
      // "there but unusable", because claiming CONFIG_NOT_FOUND about a file
      // that exists is the false negative the catalog exists to prevent.
      // ARRANGE
      const unnamed = undefined;
      const expected = { code: 'CONFIG_UNREADABLE', location: LOCATION };
      // ACT
      const actual = faultForReadFailure(unnamed, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('echoes the location it was given rather than resolving it', () => {
      // ARRANGE
      const relative = '../shared/mh.yaml';
      const missing = 'ENOENT';
      // ACT
      const actual = faultForReadFailure(missing, relative);
      // ASSERT
      expect(actual.location).toBe(relative);
    });
  });
});
