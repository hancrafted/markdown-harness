// Colocated unit test for which canaries a matrix owes.

import { describe, expect, it } from 'vitest';
import { canaryKeysFor, describeKey } from './canary-keys.pure.ts';

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
