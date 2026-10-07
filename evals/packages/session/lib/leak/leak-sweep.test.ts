// Colocated unit test for the leak sweep, with its two-sided canary: a planted
// string must be found (the sweep can fire) and a clean tree must read zero (it
// does not fire on everything).

import { describe, expect, it } from 'vitest';
import { sweepForSteeringMarker } from './leak-sweep.pure.ts';

const STEERING_MARKER = 'QQ11-2222';
const CLEAN = [
  { path: 'AGENTS.md', text: 'plain' },
  { path: 'docs/a.md', text: 'also plain' },
];

describe('sweepForSteeringMarker', () => {
  describe('success cases', () => {
    it('canary, firing side: finds a planted steering marker in a nested file and names it', () => {
      // ARRANGE
      const planted = [...CLEAN, { path: 'node_modules/x/y.txt', text: `hello ${STEERING_MARKER} there` }];
      const expectedPath = 'node_modules/x/y.txt';
      // ACT
      const verdict = sweepForSteeringMarker(planted, STEERING_MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict.ok).toBe(false);
      expect(verdict.hits.map((hit) => hit.path)).toEqual([expectedPath]);
    });

    it('canary, quiet side: reads zero over a clean tree and passes a none expectation', () => {
      // ARRANGE
      const expectedFiles = CLEAN.length;
      // ACT
      const verdict = sweepForSteeringMarker(CLEAN, STEERING_MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict).toMatchObject({ ok: true, occurrences: 0, filesOpened: expectedFiles });
    });

    it('passes a steered root holding exactly the occurrences the substitution placed', () => {
      // ARRANGE
      const files = [...CLEAN, { path: 'markdown-harness.config.yaml', text: `intent: ${STEERING_MARKER}` }];
      // ACT
      const verdict = sweepForSteeringMarker(files, STEERING_MARKER, { kind: 'exactly', occurrences: 1 });
      // ASSERT
      expect(verdict.ok).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('fails a sweep that opened no files, because it proves nothing', () => {
      // ARRANGE
      const none: never[] = [];
      // ACT
      const verdict = sweepForSteeringMarker(none, STEERING_MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict).toMatchObject({ ok: false, filesOpened: 0 });
    });

    it('fails a steered root holding more or fewer occurrences than placed', () => {
      // ARRANGE
      const twice = [{ path: 'a', text: `${STEERING_MARKER} ${STEERING_MARKER}` }];
      // ACT
      const verdicts = [
        sweepForSteeringMarker(twice, STEERING_MARKER, { kind: 'exactly', occurrences: 1 }),
        sweepForSteeringMarker(CLEAN, STEERING_MARKER, { kind: 'exactly', occurrences: 1 }),
      ];
      // ASSERT
      expect(verdicts.map((verdict) => verdict.ok)).toEqual([false, false]);
    });
  });

  describe('edge cases', () => {
    it('counts repeated occurrences within one file', () => {
      // ARRANGE
      const files = [{ path: 'a', text: `${STEERING_MARKER}\n${STEERING_MARKER}\n${STEERING_MARKER}` }];
      const expected = [{ path: 'a', count: 3 }];
      // ACT
      const verdict = sweepForSteeringMarker(files, STEERING_MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict.hits).toEqual(expected);
    });
  });
});
