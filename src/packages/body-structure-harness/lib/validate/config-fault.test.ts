// Colocated unit test for the two fault shapes every validator in this
// Package raises: a value outside its declared type, and a key outside the
// vocabulary of the mapping it sits in (design-ADR 0016).

import { describe, expect, it } from 'vitest';
import { invalidValue, unrecognisedKeys } from './config-fault.pure.ts';

const AT = 'body-structure.rules[0]';

describe('config faults', () => {
  describe('success cases', () => {
    it('names the value outside its declared type at the address given', () => {
      // ARRANGE
      const location = `${AT}.levels`;
      const expected = { code: 'CONFIG_INVALID_VALUE', location };
      // ACT
      const actual = invalidValue(location);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names each unrecognised key under the mapping, in the order written', () => {
      // ARRANGE
      const written = { maxDepth: 3, ruleId: 'r', required: true };
      const known = { ruleId: true };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.maxDepth` },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.required` },
      ];
      // ACT
      const actual = unrecognisedKeys(written, known, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names a key the vocabulary only inherits, since it is not one of its own', () => {
      // `toString` is on every object's prototype; a vocabulary checked with
      // `in` rather than as an own key would quietly admit it.
      // ARRANGE
      const written = { toString: 'x' };
      const known = { ruleId: true };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.toString` }];
      // ACT
      const actual = unrecognisedKeys(written, known, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('finds nothing to name in a mapping that writes only known keys, or none', () => {
      // ARRANGE
      const known = { ruleId: true, intent: true };
      const expected = [[], []];
      // ACT
      const actual = [unrecognisedKeys({ ruleId: 'r', intent: 'i' }, known, AT), unrecognisedKeys({}, known, AT)];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
