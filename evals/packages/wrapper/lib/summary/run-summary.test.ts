// Colocated unit test for the printed summary.

import { describe, expect, it } from 'vitest';
import { summarise } from './run-summary.pure.ts';

type Arm = 'steered' | 'neutralised' | 'control';
const row = (cell: string, arm: Arm, hit: boolean) => ({
  cell,
  arm,
  graded: true,
  markerPresent: hit,
  localised: 'clean',
});
const nullAt = (cell: string, rung: string) => ({ ...row(cell, 'steered', false), localised: rung });

describe('summarise', () => {
  describe('success cases', () => {
    it('prints each cell as a count out of a total beside the trials planned', () => {
      // ARRANGE
      const sessions = [row('push-steered', 'steered', true), nullAt('push-steered', '8')];
      const expected =
        'push-steered: 1/2 steering marker hits (2 trials planned, 0 instrument failures); nulls by rung: 8:1';
      // ACT
      const lines = summarise({ sessions, expected: 2, trialsPerCell: 2, canaryFailure: undefined });
      // ASSERT
      expect(lines).toContain(expected);
    });

    it('is complete and silent about incompleteness when every session ran and was graded', () => {
      // ARRANGE
      const sessions = [row('a', 'steered', true)];
      const word = 'INCOMPLETE';
      // ACT
      const lines = summarise({ sessions, expected: 1, trialsPerCell: 1, canaryFailure: undefined });
      // ASSERT
      expect(lines.filter((line) => line.includes(word))).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('says incomplete when a session is missing or an instrument failure sits among them', () => {
      // ARRANGE
      const missing = summarise({
        sessions: [row('a', 'steered', true)],
        expected: 2,
        trialsPerCell: 2,
        canaryFailure: undefined,
      });
      const crashed = summarise({
        sessions: [{ ...row('a', 'steered', false), graded: false }],
        expected: 1,
        trialsPerCell: 1,
        canaryFailure: undefined,
      });
      const word = 'INCOMPLETE';
      // ACT
      const actual = [missing, crashed].map((lines) => lines.filter((line) => line.includes(word)).length);
      // ASSERT
      expect(actual).toEqual([1, 1]);
    });

    it('names the canary failure as not measured', () => {
      // ARRANGE
      const expected = 'NOT MEASURED: canary failed: the hook never started';
      // ACT
      const lines = summarise({
        sessions: [],
        expected: 0,
        trialsPerCell: 1,
        canaryFailure: 'canary failed: the hook never started',
      });
      // ASSERT
      expect(lines[0]).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('flags a hit in the intent-neutralised arm as a defect in the case, never noise', () => {
      // ARRANGE
      const sessions = [row('n', 'neutralised', true), row('s', 'steered', true)];
      const word = 'DEFECT IN THE CASE';
      // ACT
      const lines = summarise({ sessions, expected: 2, trialsPerCell: 1, canaryFailure: undefined });
      // ASSERT
      expect(lines.some((line) => line.startsWith(word))).toBe(true);
    });
  });
});
