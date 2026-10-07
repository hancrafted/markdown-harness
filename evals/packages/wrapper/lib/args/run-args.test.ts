// Colocated unit test for argument parsing and the session budget.

import { describe, expect, it } from 'vitest';
import { DEFAULT_TRIALS, SESSION_LIMIT, budgetRefusal, configFileFor, parseRunArgs } from './run-args.pure.ts';

describe('parseRunArgs', () => {
  describe('success cases', () => {
    it('defaults to the real Host harness and eight trials', () => {
      // ARRANGE
      const expected = { host: 'claude', trials: DEFAULT_TRIALS };
      // ACT
      const result = parseRunArgs([]);
      // ASSERT
      expect(result).toMatchObject({ ok: true, args: expected });
    });

    it('reads a host, a trial count, a seed and the budget override', () => {
      // ARRANGE
      const expected = { host: 'stub', trials: 3, seed: 's1', allowOverBudget: true };
      const argv = ['--host', 'stub', '--trials', '3', '--seed', 's1', '--allow-over-budget'];
      // ACT
      const result = parseRunArgs(argv);
      // ASSERT
      expect(result).toMatchObject({ ok: true, args: expected });
    });

    it('reads a matrix name, defaulting to the push matrix', () => {
      // ARRANGE
      const expected = ['push', 'pull', 'carriers'];
      // ACT
      const actual = [[], ['--matrix', 'pull'], ['--matrix', 'carriers']].map((argv) => {
        const result = parseRunArgs(argv);
        return result.ok ? result.args.matrix : 'refused';
      });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('maps each matrix to its committed configuration file', () => {
      // ARRANGE
      const expected = ['promptfooconfig.yaml', 'promptfooconfig.pull.yaml', 'promptfooconfig.carriers.yaml'];
      // ACT
      const actual = [configFileFor('push'), configFileFor('pull'), configFileFor('carriers')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a self-test break against the stub Host harness', () => {
      // ARRANGE
      const expected = { host: 'stub', break: 'concurrency' };
      // ACT
      const result = parseRunArgs(['--host', 'stub', '--break', 'concurrency']);
      // ASSERT
      expect(result).toMatchObject({ ok: true, args: expected });
    });
  });

  describe('failure cases', () => {
    it('refuses a break against the real Host harness, so a live run can never be broken', () => {
      // ARRANGE
      const expected = { ok: false, problem: expect.stringMatching(/--break/) };
      // ACT
      const result = parseRunArgs(['--break', 'cache']);
      // ASSERT
      expect(result).toMatchObject(expected);
    });

    it.each([
      [['--nope']],
      [['--trials', 'x']],
      [['--trials', '0']],
      [['--host', 'codex']],
      [['--matrix', 'everything']],
      [['--seed']],
      [['--host', 'stub', '--break', 'sleep']],
    ])('refuses %j as misuse', (argv) => {
      // ARRANGE
      const expected = { ok: false };
      // ACT
      const result = parseRunArgs(argv);
      // ASSERT
      expect(result).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses a matrix above the limit unless told otherwise, and allows exactly the limit', () => {
      // ARRANGE
      const above = SESSION_LIMIT + 1;
      // ACT
      const refusals = [budgetRefusal(above, false), budgetRefusal(above, true), budgetRefusal(SESSION_LIMIT, false)];
      const expected = [expect.stringMatching(/above the/), undefined, undefined];
      // ASSERT
      expect(refusals).toEqual(expected);
    });
  });
});
