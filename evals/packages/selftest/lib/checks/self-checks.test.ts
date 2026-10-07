// Colocated unit test for the self-test's judgements, each shown red against a
// deliberately broken input before it is trusted.

import { describe, expect, it } from 'vitest';
import {
  CHECKS,
  distinctNonces,
  judgeBreaks,
  judgeMatrix,
  overlaps,
  parseInvocationLog,
  sharingHits,
} from './self-checks.pure.ts';

const at = (nonce: string, startedAt: number, endedAt: number) => ({ nonce, startedAt, endedAt });
const GOOD = {
  exitCode: 0,
  invocations: [at('a', 0, 10), at('b', 20, 30)],
  sessionIds: ['s1', 's2'],
  toolText: 'fine',
};
const EXPECT = { invocationsPerRun: 2, runs: 1, sharing: ['promptfoo.app'] };
const BREAKS = {
  concurrency: { ...GOOD, toolText: 'Duration: 1s (concurrency: 4)' },
  cacheOn: [GOOD, { ...GOOD, invocations: [at('c', 40, 50), at('d', 60, 70)], sessionIds: ['s3', 's4'] }],
};
const breakFailures = (breaks: object) =>
  judgeBreaks({ ...BREAKS, ...breaks }, EXPECT)
    .filter((finding) => !finding.ok)
    .map((finding) => finding.check);
const failing = (run: object) =>
  judgeMatrix([{ ...GOOD, ...run }], EXPECT)
    .filter((finding) => !finding.ok)
    .map((finding) => finding.check);

describe('self-test judgements', () => {
  describe('success cases', () => {
    it('passes a clean execution on every check', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = failing({});
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads the stub log, one JSON object per line', () => {
      // ARRANGE
      const text = '{"nonce":"a","startedAt":1,"endedAt":2}\n\n{"nonce":"b","startedAt":3,"endedAt":4}\n';
      const expected = ['a', 'b'];
      // ACT
      const actual = parseInvocationLog(text).map((entry) => entry.nonce);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('passes the break pass when the tool ran four wide, stayed serial, and a cache that is on still did not replay', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = breakFailures({});
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('goes red when the break pass shows the tool did not run four wide, or the sessions began to overlap', () => {
      // ARRANGE
      const narrow = { concurrency: { ...GOOD, toolText: 'Duration: 1s (concurrency: 1)' } };
      const racing = { concurrency: { ...BREAKS.concurrency, invocations: [at('a', 0, 25), at('b', 20, 30)] } };
      // ACT
      const actual = [breakFailures(narrow), breakFailures(racing)];
      // ASSERT
      expect(actual[0]).toContain(CHECKS.broken.ran);
      expect(actual[1]).toContain(CHECKS.broken.serial);
    });

    it('goes red when a cache that is on replays, which proves the nonce check can see a replay', () => {
      // ARRANGE
      const replay = { cacheOn: [GOOD, { ...GOOD, sessionIds: ['s3', 's4'] }] };
      // ACT
      const actual = breakFailures(replay);
      // ASSERT
      expect(actual).toContain(CHECKS.broken.nonces);
    });

    it('goes red when the cache break runs fewer invocations than the matrix', () => {
      // ARRANGE
      const short = { cacheOn: [GOOD, { ...GOOD, invocations: [at('c', 40, 50)], sessionIds: ['s3'] }] };
      // ACT
      const actual = breakFailures(short);
      // ASSERT
      expect(actual).toContain(CHECKS.broken.count);
    });

    it('goes red when the cache replays: a repeated nonce, and fewer invocations than the matrix', () => {
      // ARRANGE
      const replayed = { invocations: [at('a', 0, 10), at('a', 20, 30)] };
      const short = { invocations: [at('a', 0, 10)] };
      // ACT
      const actual = [failing(replayed), failing(short)];
      // ASSERT
      expect(actual[0]).toContain(CHECKS.nonces);
      expect(actual[1]).toContain(CHECKS.count);
    });

    it('goes red when two invocations overlap, which is concurrency above one', () => {
      // ARRANGE
      const racing = { invocations: [at('a', 0, 25), at('b', 20, 30)] };
      // ACT
      const actual = failing(racing);
      // ASSERT
      expect(actual).toContain(CHECKS.overlap);
    });

    it('goes red on a non-zero exit, a repeated session identifier and a sharing address', () => {
      // ARRANGE
      const broken = { exitCode: 1, sessionIds: ['s', 's'], toolText: 'see https://promptfoo.app/x' };
      const expected = [CHECKS.exit, CHECKS.sessionIds, CHECKS.sharing];
      // ACT
      const actual = failing(broken);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('counts abutting intervals as sequential and an empty log as distinct', () => {
      // ARRANGE
      const abutting = [at('a', 0, 10), at('b', 10, 20)];
      // ACT
      const actual = [overlaps(abutting), distinctNonces([]), sharingHits('nothing', ['x'])];
      // ASSERT
      expect(actual).toEqual([0, true, []]);
    });
  });
});
