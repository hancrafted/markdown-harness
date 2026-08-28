// The unit home. This suite tests ONE unit — `impl.pure.ts`, its same-directory
// sibling of the same base name — and may import nothing else internal.
//
// `isSameUtcDay` is why the home exists: the entry point exercises it only
// indirectly, through which of two renderings `summariseSpan` picks, so a false
// result and a wrong rendering are indistinguishable from `tests/`.

import { describe, expect, it } from 'vitest';
import { isSameUtcDay, toUtcDay } from './impl.pure';

const DAY = 86_400_000;

describe('isSameUtcDay', () => {
  describe('success cases', () => {
    it('holds for two instants inside one UTC day', () => {
      // ARRANGE
      const morning = 0;
      const evening = DAY - 1;
      // ACT
      const actual = isSameUtcDay(morning, evening);
      // ASSERT
      expect(actual).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('does not hold across midnight UTC, one millisecond apart', () => {
      // ARRANGE
      const beforeMidnight = DAY - 1;
      const afterMidnight = DAY;
      // ACT
      const actual = isSameUtcDay(beforeMidnight, afterMidnight);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('holds for two pre-epoch instants inside the same UTC day', () => {
      // ARRANGE
      const firstMoment = -DAY;
      const lastMoment = -1;
      // ACT
      const actual = isSameUtcDay(firstMoment, lastMoment);
      // ASSERT
      expect(actual).toBe(true);
    });

    it('names the UTC day rather than the local one for a pre-epoch instant', () => {
      // ARRANGE
      const instant = -1;
      const expected = '1969-12-31';
      // ACT
      const actual = toUtcDay(instant);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
