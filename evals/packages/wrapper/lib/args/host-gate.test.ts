// Colocated unit test for the gate between a run's arguments and the Host harness it would start. Antigravity
// has unprobed capabilities in this repository, so a live run of it must be refused by name.

import { describe, expect, it } from 'vitest';
import { NO_PROBES } from '../../../session/host-profile.ts';
import { hostRefusal } from './host-gate.pure.ts';

type RunArgs = Parameters<typeof hostRefusal>[0];

const BASE: RunArgs = {
  host: 'claude',
  matrix: 'push',
  trials: 8,
  seed: undefined,
  allowOverBudget: false,
  stubMode: 'obey',
  hostBinary: undefined,
  break: 'none',
  probeRecord: undefined,
  wallClockSeconds: undefined,
};

const run = (host: RunArgs['host'], matrix: RunArgs['matrix']): RunArgs => ({ ...BASE, host, matrix });

describe('hostRefusal', () => {
  describe('success cases', () => {
    it('lets a live Claude Code run start, which has no probes outstanding', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = hostRefusal(run('claude', 'push'), NO_PROBES);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets the stand-in run either matrix, because it touches no account', () => {
      // ARRANGE
      const expected = [undefined, undefined];
      // ACT
      const actual = [hostRefusal(run('stub', 'agy'), NO_PROBES), hostRefusal(run('stub', 'push'), NO_PROBES)];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a live Antigravity run while the probes are unprobed, naming each one', () => {
      // ARRANGE
      const expected = expect.stringContaining('unprobed capabilities: hook-fires-headless');
      // ACT
      const actual = hostRefusal(run('agy', 'agy'), NO_PROBES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the Antigravity matrix under the real Claude Code, so one Host harness never runs the other cells', () => {
      // ARRANGE
      const expected = '--host claude runs only --matrix push, pull, carriers, assess';
      // ACT
      const actual = hostRefusal(run('claude', 'agy'), NO_PROBES);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses a bound under the minimum wall clock for Antigravity, where the print timeout has no margin below it', () => {
      // ARRANGE
      const short = { ...run('agy', 'agy'), wallClockSeconds: 5 };
      const recorded = Object.fromEntries(
        ['hook-fires-headless', 'scoped-permission-mode', 'scratch-home-credentials'].map((id) => [
          id,
          { status: 'works', detail: 'd', recordedAt: 't' },
        ]),
      );
      const expected = expect.stringContaining('minimum is 10s');
      // ACT
      const actual = hostRefusal(short, recorded);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the same short bound under the stand-in running the Antigravity matrix, so the self-test can reach it', () => {
      // ARRANGE
      const short = { ...run('stub', 'agy'), wallClockSeconds: 5 };
      const expected = expect.stringContaining('minimum is 10s');
      // ACT
      const actual = hostRefusal(short, NO_PROBES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets a short bound through for Claude Code, which has no print timeout to keep below it', () => {
      // ARRANGE
      const short = { ...run('claude', 'push'), wallClockSeconds: 5 };
      // ACT
      const actual = hostRefusal(short, NO_PROBES);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('lets a live Antigravity run start once every probe is recorded, whatever each answered', () => {
      // ARRANGE
      const failed = Object.fromEntries(
        ['hook-fires-headless', 'scoped-permission-mode', 'scratch-home-credentials'].map((id) => [
          id,
          { status: 'fails', detail: 'd', recordedAt: 't' },
        ]),
      );
      // ACT
      const actual = hostRefusal(run('agy', 'agy'), failed);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses a Claude Code matrix under --host agy before it asks about probes', () => {
      // ARRANGE
      const expected = '--host agy runs only --matrix agy';
      // ACT
      const actual = hostRefusal(run('agy', 'pull'), NO_PROBES);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
