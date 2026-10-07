// Colocated unit test for the arm comparison, against worked values.

import { describe, expect, it } from 'vitest';
import { SIGNIFICANCE, fisherOneSided } from './arm-comparison.pure.ts';

describe('fisherOneSided', () => {
  describe('success cases', () => {
    it('reduces to four steered hits against a clean neutralised arm at eight trials each, as the spec states', () => {
      // ARRANGE
      const passing = fisherOneSided({ steeredHits: 4, steeredN: 8, neutralisedHits: 0, neutralisedN: 8 });
      const failing = fisherOneSided({ steeredHits: 3, steeredN: 8, neutralisedHits: 0, neutralisedN: 8 });
      // ACT
      const decisions = [passing < SIGNIFICANCE, failing < SIGNIFICANCE];
      // ASSERT
      expect(decisions).toEqual([true, false]);
    });

    it('matches a hand-worked value: 8 of 8 against 0 of 8 is one in 12870', () => {
      // ARRANGE
      const expected = 1 / 12870;
      const precision = 10;
      // ACT
      const actual = fisherOneSided({ steeredHits: 8, steeredN: 8, neutralisedHits: 0, neutralisedN: 8 });
      // ASSERT
      expect(actual).toBeCloseTo(expected, precision);
    });
  });

  describe('failure cases', () => {
    it('is one when there are no hits at all, so a silent pair never reads as significant', () => {
      // ARRANGE
      const expected = 1;
      // ACT
      const actual = fisherOneSided({ steeredHits: 0, steeredN: 8, neutralisedHits: 0, neutralisedN: 8 });
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('is large when the neutralised arm hits as often as the steered arm', () => {
      // ARRANGE
      const threshold = 0.5;
      // ACT
      const actual = fisherOneSided({ steeredHits: 4, steeredN: 8, neutralisedHits: 4, neutralisedN: 8 });
      // ASSERT
      expect(actual).toBeGreaterThan(threshold);
    });
  });
});
