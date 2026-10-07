// Colocated unit test for the canary verdict.

import { describe, expect, it } from 'vitest';
import { evaluateCanary } from './canary.pure.ts';

const START = { seq: 0, kind: 'hook-start', hookName: 'PreToolUse:Write' } as const;
const ANSWER = (output: string) => ({ seq: 1, kind: 'hook-response', hookName: 'PreToolUse:Write', output }) as const;

describe('evaluateCanary', () => {
  describe('success cases', () => {
    it('passes when the hook started and answered with output', () => {
      // ARRANGE
      const events = [START, ANSWER('{"x":1}')];
      // ACT
      const actual = evaluateCanary(events);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails when the hook never started, and when it answered with nothing', () => {
      // ARRANGE
      const expected = [/never started/, /answered with nothing/];
      // ACT
      const actual = [evaluateCanary([]), evaluateCanary([START, ANSWER('  ')])];
      // ASSERT
      expect(actual[0]).toMatch(expected[0] as RegExp);
      expect(actual[1]).toMatch(expected[1] as RegExp);
    });
  });

  describe('edge cases', () => {
    it('does not count a response with no start event as a firing hook', () => {
      // ARRANGE
      const events = [ANSWER('{"x":1}')];
      // ACT
      const actual = evaluateCanary(events);
      // ASSERT
      expect(actual).toMatch(/never started/);
    });
  });
});
