// Colocated unit test for the gate-answer-to-catalog mapping.
//
// Extracted from the loader so the mapping can be asserted without a
// filesystem: planting an unreadable file is a permission-dependent setup that
// says nothing about the rule being tested. What the PLATFORM calls each
// failure is no longer this Package's question — `foundation` answers that
// once, and its own unit test holds it.

import { describe, expect, it } from 'vitest';
import { faultForUnread } from './read-fault.pure';

const LOCATION = 'markdown-harness.config.yaml';

describe('faultForUnread', () => {
  describe('success cases', () => {
    it('maps a missing entry to CONFIG_NOT_FOUND', () => {
      // ARRANGE
      const missing = { kind: 'absent', location: LOCATION } as const;
      const expected = { code: 'CONFIG_NOT_FOUND', location: LOCATION };
      // ACT
      const actual = faultForUnread(missing, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('maps anything that is there and will not open to CONFIG_UNREADABLE', () => {
      // A directory standing where the file should be, and a permission
      // refusal, arrive as the same answer from the gate and earn the same
      // code: something is there, and it cannot be served.
      // ARRANGE
      const present = { kind: 'unreadable', location: LOCATION } as const;
      const expected = { code: 'CONFIG_UNREADABLE', location: LOCATION };
      // ACT
      const actual = faultForUnread(present, LOCATION);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('echoes the location it was given rather than resolving it', () => {
      // ARRANGE
      const relative = '../shared/mh.yaml';
      const missing = { kind: 'absent', location: LOCATION } as const;
      // ACT
      const actual = faultForUnread(missing, relative);
      // ASSERT
      expect(actual.location).toBe(relative);
    });
  });
});
