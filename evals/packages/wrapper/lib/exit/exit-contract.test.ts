// Colocated unit test for the exit derivation. The eval tool's own exit code is
// not an input: it is 100 for a failed assertion and 0 for a pass, and says
// nothing about whether the instrument ran. Hand-built results files only.

import { describe, expect, it } from 'vitest';
import { MISUSE, deriveExit, expectedSessions } from './exit-contract.pure.ts';

const graded = { graded: true };
const crashed = { graded: false, failureKind: 'authentication-failure' };
const rows = (count: number, row: object = graded) => Array.from({ length: count }, () => row) as never;

describe('deriveExit', () => {
  describe('success cases', () => {
    it('exits zero when every expected session ran and was graded, however many were graded failures', () => {
      // ARRANGE
      const expected = { code: 0, reasons: [] };
      // ACT
      const actual = deriveExit({ rows: rows(24), expected: 24, toolCount: 24 });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('exits one on a single instrument failure, naming its kind', () => {
      // ARRANGE
      const mixed = [...rows(23), crashed] as never;
      const kind = 'authentication-failure';
      // ACT
      const actual = deriveExit({ rows: mixed, expected: 24, toolCount: 24 });
      // ASSERT
      expect(actual.code).toBe(1);
      expect(actual.reasons).toContain(`instrument failure: ${kind}`);
    });

    it('exits one on a short results file, an empty one and a missing one', () => {
      // ARRANGE
      const inputs = [rows(23), rows(0), undefined];
      // ACT
      const codes = inputs.map((input) => deriveExit({ rows: input, expected: 24, toolCount: 24 }).code);
      // ASSERT
      expect(codes).toEqual([1, 1, 1]);
    });

    it('exits one when the tool counts fewer sessions than the file holds rows', () => {
      // ARRANGE
      const input = { rows: rows(24), expected: 24, toolCount: 12 };
      // ACT
      const actual = deriveExit(input);
      // ASSERT
      expect(actual.code).toBe(1);
    });

    it('exits one on a failure the wrapper named itself', () => {
      // ARRANGE
      const input = { rows: rows(24), expected: 24, toolCount: 24, wrapperFailure: 'canary-failed' };
      // ACT
      const actual = deriveExit(input);
      // ASSERT
      expect(actual.code).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('keeps misuse a third code distinct from an instrument failure', () => {
      // ARRANGE
      const expected = 2;
      // ACT
      const actual = MISUSE;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('computes the expected session count from the matrix and refuses nothing here', () => {
      // ARRANGE
      const expected = 24;
      // ACT
      const actual = expectedSessions({ cells: 3, trials: 8, cases: 1 });
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
