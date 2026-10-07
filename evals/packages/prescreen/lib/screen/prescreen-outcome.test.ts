// Colocated unit test for the screen's outcome: the report, the record and the exit code.

import { describe, expect, it } from 'vitest';
import { screenOutcome } from './prescreen-outcome.pure.ts';

const sample = (text: string) => ({ model: 'sonnet', prompt: 'task', text });

const outcomeOf = (overrides: object = {}) =>
  screenOutcome({
    runDir: '/r',
    seed: 's',
    candidates: ['alpha'],
    samples: [sample('nothing')],
    failures: [],
    expected: 1,
    ...overrides,
  });

describe('screenOutcome', () => {
  describe('success cases', () => {
    it('exits zero and names the seed when every expected answer was read', () => {
      // ARRANGE
      const expectedCode = 0;
      const seedLine = 'seed s, recorded in /r';
      // ACT
      const actual = outcomeOf();
      // ASSERT
      expect(actual.code).toBe(expectedCode);
      expect(actual.report).toContain(seedLine);
    });

    it('exits zero for a refused candidate, which is a result', () => {
      // ARRANGE
      const samples = [sample('alpha here')];
      const refusal = 'alpha: REFUSED';
      // ACT
      const actual = outcomeOf({ samples });
      // ASSERT
      expect(actual.code).toBe(0);
      expect(actual.report).toContain(refusal);
    });
  });

  describe('failure cases', () => {
    it('exits one and names the count when fewer answers were read than expected', () => {
      // ARRANGE
      const expected = '0 answers read, expected 1';
      // ACT
      const actual = outcomeOf({ samples: [] });
      // ASSERT
      expect(actual.code).toBe(1);
      expect(actual.report).toContain(expected);
    });

    it('exits one and reports at most five session failures', () => {
      // ARRANGE
      const failures = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      const shown = 'instrument failure: e';
      const hidden = 'instrument failure: f';
      // ACT
      const actual = outcomeOf({ failures });
      // ASSERT
      expect(actual.code).toBe(1);
      expect(actual.report).toContain(shown);
      expect(actual.report).not.toContain(hidden);
    });
  });

  describe('edge cases', () => {
    it('records the seed, every verdict and every failure, not only the first five', () => {
      // ARRANGE
      const failures = ['a', 'b', 'c', 'd', 'e', 'f'];
      const seed = 's';
      // ACT
      const actual = JSON.parse(outcomeOf({ failures }).record) as { seed: string; failures: string[] };
      // ASSERT
      expect(actual.seed).toBe(seed);
      expect(actual.failures).toEqual(failures);
    });
  });
});
