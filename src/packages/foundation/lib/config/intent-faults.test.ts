// Colocated unit test for Core's judgement of a written `intent`: blank is one
// code, the wrong type another, and an absent key is no fault here.

import { describe, expect, it } from 'vitest';
import { intentFaults } from './intent-faults.pure.ts';

const AT = 'section.rules[0]';

describe('intent faults', () => {
  describe('success cases', () => {
    it('finds nothing in a written sentence or an absent key', () => {
      // ARRANGE
      const carriers = [{ intent: 'Why the rule exists.' }, {}];
      const expected = [[], []];
      // ACT
      const actual = carriers.map((carrier) => intentFaults(carrier, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports an intent written and left blank, empty or null, at the key', () => {
      // ARRANGE
      const carriers = [{ intent: '' }, { intent: null }];
      const blank = [{ code: 'CONFIG_EMPTY_INTENT', location: `${AT}.intent` }];
      const expected = [blank, blank];
      // ACT
      const actual = carriers.map((carrier) => intentFaults(carrier, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an intent of the wrong type as an invalid value, never as blank', () => {
      // ARRANGE
      const carriers = [{ intent: false }, { intent: 0 }, { intent: 5 }, { intent: ['a list'] }, { intent: {} }];
      const invalid = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.intent` }];
      const expected = carriers.map(() => invalid);
      // ACT
      const actual = carriers.map((carrier) => intentFaults(carrier, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads a whitespace-only sentence as written, not blank', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = intentFaults({ intent: ' ' }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
