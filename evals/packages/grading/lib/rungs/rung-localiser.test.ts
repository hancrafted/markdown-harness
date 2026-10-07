// Colocated unit test for the localiser: one observation per rung, walked in
// R1's decision-procedure order, never two rungs.

import { describe, expect, it } from 'vitest';
import type { RungNumber, RungStatus } from '../../localise-rung.ts';
import { localiseRung, observableTable, rungObservations } from './rung-localiser.pure.ts';

function record(overrides: Partial<Record<RungNumber, RungStatus>>) {
  return rungObservations(overrides);
}

describe('localiseRung', () => {
  describe('success cases', () => {
    it.each([1, 2, 3, 4, 5, 7, 8, 10] as const)('names rung %i when it alone failed', (rung) => {
      // ARRANGE
      const observations = record({ [rung]: 'failed' });
      const expected = { kind: 'rung', rung };
      // ACT
      const actual = localiseRung(observations);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('returns clean when every rung is clean or not applicable', () => {
      // ARRANGE
      const observations = record({ 2: 'not-applicable' });
      const expected = { kind: 'clean' };
      // ACT
      const actual = localiseRung(observations);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('returns the earlier of two failed rungs, so swapping two rungs changes the answer', () => {
      // ARRANGE
      const observations = record({ 3: 'failed', 5: 'failed' });
      const expected = { kind: 'rung', rung: 3 };
      // ACT
      const actual = localiseRung(observations);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the earlier rung it could not observe rather than blame a later one', () => {
      // ARRANGE
      const observations = record({ 3: 'not-observable', 8: 'failed' });
      const expected = { kind: 'cannot-localise', blockedBy: 3 };
      // ACT
      const actual = localiseRung(observations);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('is not blocked by a rung that does not apply to the cell', () => {
      // ARRANGE
      const observations = record({ 6: 'not-applicable', 8: 'failed' });
      const expected = { kind: 'rung', rung: 8 };
      // ACT
      const actual = localiseRung(observations);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('prints which rungs the cell could observe, derived from the record', () => {
      // ARRANGE
      const observations = record({ 2: 'not-applicable', 4: 'not-observable', 5: 'failed' });
      const expected = ['1 observed', '2 not applicable', '3 observed', '4 not observable', '5 observed'];
      // ACT
      const actual = observableTable(observations).slice(0, 5);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
