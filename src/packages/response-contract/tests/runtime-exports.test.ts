import { describe, expect, it } from 'vitest';
import { configError, isConfigError } from '../index.ts';

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
    it('identifies a rejection that carries no fault as a config error all the same', () => {
      // ARRANGE
      const result = configError([]);
      const expected = true;
      // ACT
      const actual = isConfigError(result);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
