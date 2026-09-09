// Colocated unit test for the Assessment instant.
//
// The two checks this file holds answer different questions, and the edge cases
// are where that shows: a value can be well-formed and name no moment, which is
// exactly the case the `datetime` format admits and this argument must not.

import { describe, expect, it } from 'vitest';
import { isAssessmentInstant } from './assessment-instant.pure';

describe('isAssessmentInstant', () => {
  describe('success cases', () => {
    it('accepts an instant with an explicit UTC offset', () => {
      // ARRANGE
      const value = '2026-12-01T00:00:00Z';
      const expected = true;
      // ACT
      const actual = isAssessmentInstant(value);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('accepts every offset spelling RFC 3339 grants', () => {
      // Lowercase `t` and `z` are the leniency the grammar allows, and a
      // numeric offset is as explicit as `Z` — both name a moment.
      // ARRANGE
      const values = ['2026-12-01t00:00:00z', '2026-12-01T00:00:00+02:00', '2026-12-01T00:00:00-05:00'];
      const expected = [true, true, true];
      // ACT
      const actual = values.map(isAssessmentInstant);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses an instant with no offset, which would resolve through the host zone', () => {
      // ARRANGE
      const value = '2026-12-01T00:00:00';
      const expected = false;
      // ACT
      const actual = isAssessmentInstant(value);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('refuses a date with no time, a bare year, and prose', () => {
      // ARRANGE
      const values = ['2026-12-01', '2026', 'yesterday', ''];
      const expected = [false, false, false, false];
      // ACT
      const actual = values.map(isAssessmentInstant);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses the days `Date.parse` would silently roll over', () => {
      // Measured on Node 26.5.0: `Date.parse` reads `2026-02-30T00:00:00Z` as
      // March 2nd, `2026-02-29` as March 1st in a common year, and
      // `T24:00:00` as the next midnight. `now` is echoed as written, so a
      // rollover would print one instant and compare against another. Each is
      // refused here by arithmetic instead.
      // ARRANGE
      const values = ['2026-02-30T00:00:00Z', '2026-02-29T00:00:00Z', '2026-12-01T24:00:00Z'];
      const expected = [false, false, false];
      // ACT
      const actual = values.map(isAssessmentInstant);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts February 29th in a leap year, and the century rule both ways', () => {
      // The leap rule in full, because a wrong one is invisible for decades:
      // 2024 leaps, 2100 does not, 2000 does.
      // ARRANGE
      const values = ['2024-02-29T00:00:00Z', '2100-02-29T00:00:00Z', '2000-02-29T00:00:00Z'];
      const expected = [true, false, true];
      // ACT
      const actual = values.map(isAssessmentInstant);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a fractional part, and refuses out-of-range time and offset parts', () => {
      // ARRANGE
      const values = ['2026-12-01T00:00:00.123Z', '2026-12-01T25:00:00Z', '2026-12-01T00:00:00+24:00'];
      const expected = [true, false, false];
      // ACT
      const actual = values.map(isAssessmentInstant);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
