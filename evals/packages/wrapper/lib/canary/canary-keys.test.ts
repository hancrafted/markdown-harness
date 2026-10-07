// Colocated unit test for which canaries a matrix owes.

import { describe, expect, it } from 'vitest';
import { canaryKeysFor, describeKey, unprovableKeys } from './canary-keys.pure.ts';

const PUSH = { hostName: 'claude-code', deliveryChannel: 'push' } as const;
const USER_TURN = { hostName: 'claude-code', deliveryChannel: 'user-turn' } as const;
const LAYOUT = 'evals/suites/steering/seed/research-note';

describe('canaryKeysFor', () => {
  describe('success cases', () => {
    it('owes one canary to the phase 1 matrix: one Host harness, one push channel, one root layout', () => {
      // ARRANGE
      const expected = [{ host: 'claude-code', channel: 'push', layout: LAYOUT }];
      // ACT
      const actual = canaryKeysFor([PUSH, PUSH, USER_TURN], [LAYOUT, LAYOUT]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('owes a pull cell its own canary beside a push cell over the same root layout', () => {
      // ARRANGE
      const pull = { hostName: 'claude-code', deliveryChannel: 'pull' } as const;
      const expected = ['claude-code/pull/a', 'claude-code/push/a'];
      // ACT
      const actual = canaryKeysFor([PUSH, pull], ['a']).map(describeKey);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('owes a canary to each new Host harness and each new root layout, so phase 2 adds rows', () => {
      // ARRANGE
      const other = { hostName: 'codex', deliveryChannel: 'push' } as const;
      const expected = ['claude-code/push/a', 'claude-code/push/b', 'codex/push/a', 'codex/push/b'];
      // ACT
      const actual = canaryKeysFor([PUSH, other], ['a', 'b']).map(describeKey);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('owes none to a channel with nothing to canary, the trusted-prompt control', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = canaryKeysFor([USER_TURN], [LAYOUT]).map(describeKey);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('owes none to a matrix with no cells or no layouts', () => {
      // ARRANGE
      const expected = [0, 0];
      // ACT
      const actual = [canaryKeysFor([], [LAYOUT]).length, canaryKeysFor([PUSH], []).length];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('unprovableKeys', () => {
  const agyPull = { host: 'antigravity', channel: 'pull', layout: LAYOUT } as const;
  const agyPush = { host: 'antigravity', channel: 'push', layout: LAYOUT } as const;
  const claudePush = { host: 'claude-code', channel: 'push', layout: LAYOUT } as const;

  describe('success cases', () => {
    it('owes an Antigravity pull canary, which the canary itself proves at run time, and a Claude Code push one', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = unprovableKeys([agyPull, claudePush]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keys Antigravity cells under their own host name', () => {
      // ARRANGE
      const cell = { hostName: 'antigravity', deliveryChannel: 'pull' } as const;
      const expected = ['antigravity/pull/a'];
      // ACT
      const actual = canaryKeysFor([cell], ['a']).map(describeKey);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses an Antigravity push key, whose hook-firing probe is unprobed, instead of owing a canary nobody can pass', () => {
      // ARRANGE
      const expected = ['antigravity push: hook-fires-headless is unprobed, so no canary can be owed for it'];
      // ACT
      const actual = unprovableKeys([agyPush]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses a key whose host is not a known Host harness rather than guessing a profile', () => {
      // ARRANGE
      const expected = ['codex push: no such Host harness'];
      // ACT
      const actual = unprovableKeys([{ host: 'codex', channel: 'push', layout: LAYOUT }]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
