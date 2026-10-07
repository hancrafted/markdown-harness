// Colocated unit test for the canary verdict.

import { describe, expect, it } from 'vitest';
import { evaluateCanary, evaluatePullCanary } from './canary.pure.ts';

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

const ASK = { seq: 0, kind: 'tool-call', id: 'q', tool: 'Bash', input: { command: 'bin/mh query docs/a.md' } } as const;
const REPLY = (text: string, isError = false) => ({ seq: 1, kind: 'tool-result', id: 'q', isError, text }) as const;

describe('evaluatePullCanary', () => {
  describe('success cases', () => {
    it('passes when the query command ran and answered without error', () => {
      // ARRANGE
      const events = [ASK, REPLY('{"governance":"governed"}')];
      // ACT
      const actual = evaluatePullCanary(events);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails when the command never ran, when it was denied, and when it answered with nothing', () => {
      // ARRANGE
      const expected = [/never ran/, /error or nothing/, /error or nothing/];
      // ACT
      const actual = [
        evaluatePullCanary([]),
        evaluatePullCanary([ASK, REPLY('denied', true)]),
        evaluatePullCanary([ASK, REPLY('  ')]),
      ];
      // ASSERT
      expected.forEach((pattern, index) => expect(actual[index]).toMatch(pattern));
    });
  });

  describe('edge cases', () => {
    it('does not count a shell call that is not the query command', () => {
      // ARRANGE
      const other = { ...ASK, input: { command: 'ls' } };
      // ACT
      const actual = evaluatePullCanary([other, REPLY('files')]);
      // ASSERT
      expect(actual).toMatch(/never ran/);
    });
  });
});
