// Colocated unit test for the stand-in's command: the stand-in is told which Host harness's stream to print by an
// explicit flag, never by sniffing the argv it is given.

import { describe, expect, it } from 'vitest';
import { stubCommand } from './stub-command.pure.ts';

const WHERE = { checkout: '/c', runDir: '/r' };

describe('stubCommand', () => {
  describe('success cases', () => {
    it('names the Antigravity stream for the Antigravity matrix', () => {
      // ARRANGE
      const expected = ['--stub-host', 'agy'];
      // ACT
      const actual = stubCommand({ ...WHERE, matrix: 'agy', stubMode: 'obey' });
      // ASSERT
      expect(actual).toEqual(expect.arrayContaining(expected));
    });

    it('names the Claude Code stream for every other matrix', () => {
      // ARRANGE
      const expected = [['--stub-host', 'claude']];
      // ACT
      const actual = (['push', 'pull', 'carriers'] as const).map((matrix) =>
        stubCommand({ ...WHERE, matrix, stubMode: 'obey' }).slice(-2),
      );
      // ASSERT
      expect(actual).toEqual([...expected, ...expected, ...expected]);
    });
  });

  describe('failure cases', () => {
    it('never makes the stream depend on a flag of the Host harness, so a print timeout in argv is not a signal', () => {
      // ARRANGE
      const forbidden = '--print-timeout';
      // ACT
      const actual = stubCommand({ ...WHERE, matrix: 'agy', stubMode: 'obey' });
      // ASSERT
      expect(actual).not.toContain(forbidden);
    });
  });

  describe('edge cases', () => {
    it('keeps the stand-in script, mode and session log in the command', () => {
      // ARRANGE
      const expected = ['node', '/c/evals/self-test/stub-host.mjs', '--mode', 'deaf', '--log', '/r/stub-sessions.log'];
      // ACT
      const actual = stubCommand({ ...WHERE, matrix: 'push', stubMode: 'deaf' });
      // ASSERT
      expect(actual.slice(0, expected.length)).toEqual(expected);
    });
  });
});
