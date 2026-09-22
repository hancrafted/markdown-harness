import { describe, expect, it } from 'vitest';
import { FIELD_VIOLATION_CODES, isConfigError } from '../index.ts';

describe('response-contract runtime exports', () => {
  describe('success cases', () => {
    it('identifies a config error result', () => {
      // ARRANGE
      const result = { error: 'config unreadable' };
      const expected = true;
      // ACT
      const actual = isConfigError(result);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('does not identify a successful result as a config error', () => {
      // ARRANGE
      const result = { result: {} };
      const expected = false;
      // ACT
      const actual = isConfigError(result);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('publishes the field code a consumer compares from JSON', () => {
      // ARRANGE
      const expected = 'MISSING_REQUIRED_FIELD';
      // ACT
      const actual = FIELD_VIOLATION_CODES.MISSING_REQUIRED_FIELD;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
