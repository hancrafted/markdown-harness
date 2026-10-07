// Colocated unit test for the gate between a run's arguments and the Host harness it would start. Antigravity
// has unprobed capabilities in this repository, so a live run of it must be refused by name.

import { describe, expect, it } from 'vitest';
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
};

const run = (host: RunArgs['host'], matrix: RunArgs['matrix']): RunArgs => ({ ...BASE, host, matrix });

describe('hostRefusal', () => {
  describe('success cases', () => {
    it('lets a live Claude Code run start, which has no probes outstanding', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = hostRefusal(run('claude', 'push'));
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets the stand-in run either matrix, because it touches no account', () => {
      // ARRANGE
      const expected = [undefined, undefined];
      // ACT
      const actual = [hostRefusal(run('stub', 'agy')), hostRefusal(run('stub', 'push'))];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a live Antigravity run while the probes are unprobed, naming each one', () => {
      // ARRANGE
      const expected = expect.stringContaining('unprobed capabilities: hook-fires-headless');
      // ACT
      const actual = hostRefusal(run('agy', 'agy'));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the Antigravity matrix under the real Claude Code, so one Host harness never runs the other cells', () => {
      // ARRANGE
      const expected = '--matrix agy runs only under --host agy or --host stub';
      // ACT
      const actual = hostRefusal(run('claude', 'agy'));
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses a Claude Code matrix under --host agy before it asks about probes', () => {
      // ARRANGE
      const expected = '--host agy runs only --matrix agy';
      // ACT
      const actual = hostRefusal(run('agy', 'pull'));
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
