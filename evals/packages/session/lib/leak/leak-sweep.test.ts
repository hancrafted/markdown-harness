// Colocated unit test for the leak sweep, with its two-sided canary: a planted
// string must be found (the sweep can fire) and a clean tree must read zero (it
// does not fire on everything).

import { describe, expect, it } from 'vitest';
import { sweepForMarker } from './leak-sweep.pure.ts';

const MARKER = 'QQ11-2222';
const CLEAN = [
  { path: 'AGENTS.md', text: 'plain' },
  { path: 'docs/a.md', text: 'also plain' },
];

describe('sweepForMarker', () => {
  describe('success cases', () => {
    it('canary, firing side: finds a planted marker in a nested file and names it', () => {
      // ARRANGE
      const planted = [...CLEAN, { path: 'node_modules/x/y.txt', text: `hello ${MARKER} there` }];
      const expectedPath = 'node_modules/x/y.txt';
      // ACT
      const verdict = sweepForMarker(planted, MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict.ok).toBe(false);
      expect(verdict.hits.map((hit) => hit.path)).toEqual([expectedPath]);
    });

    it('canary, quiet side: reads zero over a clean tree and passes a none expectation', () => {
      // ARRANGE
      const expectedFiles = CLEAN.length;
      // ACT
      const verdict = sweepForMarker(CLEAN, MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict).toMatchObject({ ok: true, occurrences: 0, filesOpened: expectedFiles });
    });

    it('passes a steered root holding exactly the occurrences the substitution placed', () => {
      // ARRANGE
      const files = [...CLEAN, { path: 'markdown-harness.config.yaml', text: `intent: ${MARKER}` }];
      // ACT
      const verdict = sweepForMarker(files, MARKER, { kind: 'exactly', occurrences: 1 });
      // ASSERT
      expect(verdict.ok).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('fails a sweep that opened no files, because it proves nothing', () => {
      // ARRANGE
      const none: never[] = [];
      // ACT
      const verdict = sweepForMarker(none, MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict).toMatchObject({ ok: false, filesOpened: 0 });
    });

    it('fails a steered root holding more or fewer occurrences than placed', () => {
      // ARRANGE
      const twice = [{ path: 'a', text: `${MARKER} ${MARKER}` }];
      // ACT
      const verdicts = [
        sweepForMarker(twice, MARKER, { kind: 'exactly', occurrences: 1 }),
        sweepForMarker(CLEAN, MARKER, { kind: 'exactly', occurrences: 1 }),
      ];
      // ASSERT
      expect(verdicts.map((verdict) => verdict.ok)).toEqual([false, false]);
    });
  });

  describe('edge cases', () => {
    it('counts repeated occurrences within one file', () => {
      // ARRANGE
      const files = [{ path: 'a', text: `${MARKER}\n${MARKER}\n${MARKER}` }];
      const expected = [{ path: 'a', count: 3 }];
      // ACT
      const verdict = sweepForMarker(files, MARKER, { kind: 'none' });
      // ASSERT
      expect(verdict.hits).toEqual(expected);
    });
  });
});
