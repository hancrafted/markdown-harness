// Colocated unit test for reading a run's results, against hand-built files.

import { describe, expect, it } from 'vitest';
import { duplicateSessionIds, parseSidecar, toolSessionCount, unpairedFields } from './results-reading.pure.ts';

const SIDECAR = JSON.stringify({
  cell: 'push-steered',
  arm: 'steered',
  graded: true,
  steeringMarkerPresent: true,
  localised: 'clean',
  sessionId: 'a',
});
const row = (sessionId: string | undefined) => ({
  sessionId,
  summary: { cell: 'c', arm: 'steered', graded: true, steeringMarkerPresent: true, localised: 'clean' } as const,
});

describe('parseSidecar', () => {
  describe('success cases', () => {
    it('reads a graded row and carries its session identifier', () => {
      // ARRANGE
      const expected = { sessionId: 'a', summary: { cell: 'push-steered', graded: true } };
      // ACT
      const actual = parseSidecar(SIDECAR);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses text that is not a row, rather than counting it', () => {
      // ARRANGE
      const inputs = ['not json', '{}', '[]', '{"cell":3}'];
      // ACT
      const actual = inputs.map(parseSidecar);
      // ASSERT
      expect(actual).toEqual([undefined, undefined, undefined, undefined]);
    });
  });

  describe('edge cases', () => {
    it('finds duplicate session identifiers and ignores rows with none', () => {
      // ARRANGE
      const rows = [row('x'), row('y'), row('x'), row(undefined), row(undefined)];
      const expected = ['x'];
      // ACT
      const actual = duplicateSessionIds(rows);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('toolSessionCount', () => {
  describe('success cases', () => {
    it('sums the tool statistics into a session count', () => {
      // ARRANGE
      const text = JSON.stringify({ results: { stats: { successes: 5, failures: 3, errors: 1 } } });
      const expected = 9;
      // ACT
      const actual = toolSessionCount(text);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('reads nothing from an empty, short or unparseable file', () => {
      // ARRANGE
      const inputs = ['', '{}', '{"results":{}}', 'oops', '{"results":{"stats":{"successes":1}}}'];
      // ACT
      const actual = inputs.map(toolSessionCount);
      // ASSERT
      expect(actual).toEqual([undefined, undefined, undefined, undefined, undefined]);
    });
  });

  describe('edge cases', () => {
    it('counts zero as a real count, not as missing', () => {
      // ARRANGE
      const text = JSON.stringify({ results: { stats: { successes: 0, failures: 0, errors: 0 } } });
      // ACT
      const actual = toolSessionCount(text);
      // ASSERT
      expect(actual).toBe(0);
    });
  });
});

describe('unpairedFields', () => {
  const withCohort = (cohort: Record<string, unknown>) => ({ ...row('x'), cohortRow: cohort });

  describe('success cases', () => {
    it('finds nothing when every graded row of a cell shares a cohort, and does not pair across cells', () => {
      // ARRANGE
      const rows = [
        withCohort({ hostVersion: 'v', arm: 'steered' }),
        withCohort({ hostVersion: 'v', arm: 'neutralised' }),
      ];
      // ACT
      const actual = unpairedFields(rows);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('names the field on which two rows of one run disagree', () => {
      // ARRANGE
      const rows = [withCohort({ hostVersion: 'v1' }), withCohort({ hostVersion: 'v2' })];
      const expected = ['hostVersion'];
      // ACT
      const actual = unpairedFields(rows);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads no rows, or rows with no cohort, as nothing to compare', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = [...unpairedFields([]), ...unpairedFields([row('x')])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
