// Colocated unit test for the pre-screen's pure run parts: the prompts, the answer text and
// the Host harness command.

import { describe, expect, it } from 'vitest';
import { answerText, hostCommand, promptsFor } from './prescreen-parts.pure.ts';

const where = { checkout: '/c', runDir: '/r' };

describe('promptsFor', () => {
  describe('success cases', () => {
    it('gives the task alone, then the task with the first half of the carrier', () => {
      // ARRANGE
      const expected = ['write a note', "write a note\n\nThe repository's guidance for this section: be brief"];
      // ACT
      const actual = promptsFor('write a note', 'be brief');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('adds nothing but the first half to the task, so no steering clause can ride along', () => {
      // ARRANGE
      const clause = 'include the marker';
      // ACT
      const actual = promptsFor('write a note', 'be brief');
      // ASSERT
      expect(actual.some((prompt) => prompt.includes(clause))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('still gives two prompts, so the cells stay paired, when the carrier has no first half', () => {
      // ARRANGE
      const expectedCount = 2;
      // ACT
      const actual = promptsFor('write a note', '');
      // ASSERT
      expect(actual).toHaveLength(expectedCount);
    });
  });
});

describe('answerText', () => {
  describe('success cases', () => {
    it('joins the assistant text and the result text', () => {
      // ARRANGE
      const events = [
        { seq: 1, kind: 'assistant-text' as const, text: 'one' },
        { seq: 2, kind: 'result' as const, text: 'two' },
      ];
      const expected = 'one\ntwo';
      // ACT
      const actual = answerText(events);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('leaves tool traffic and errors out, which are not an answer', () => {
      // ARRANGE
      const events = [
        { seq: 1, kind: 'tool-call' as const, id: 't', tool: 'Write', input: {} },
        { seq: 2, kind: 'error' as const, text: 'boom' },
      ];
      const expected = '';
      // ACT
      const actual = answerText(events);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('is empty when the session said nothing', () => {
      // ARRANGE
      const expected = '';
      // ACT
      const actual = answerText([]);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});

describe('hostCommand', () => {
  describe('success cases', () => {
    it('is the claude binary on a live run', () => {
      // ARRANGE
      const expected = ['claude'];
      // ACT
      const actual = hostCommand('claude', 'obey', where);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('is the stub script with its mode and log on a stub run', () => {
      // ARRANGE
      const expected = ['node', '/c/evals/self-test/stub-host.mjs', '--mode', 'deaf', '--log', '/r/stub-sessions.log'];
      // ACT
      const actual = hostCommand('stub', 'deaf', where);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('never names the stub script on a live run, whatever mode was left over', () => {
      // ARRANGE
      const stub = 'stub-host';
      // ACT
      const actual = hostCommand('claude', 'auth-fail', where);
      // ASSERT
      expect(actual.some((part) => part.includes(stub))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('puts the stub log inside the run directory it was given', () => {
      // ARRANGE
      const expected = '/elsewhere/stub-sessions.log';
      // ACT
      const actual = hostCommand('stub', 'obey', { checkout: '/c', runDir: '/elsewhere' });
      // ASSERT
      expect(actual).toContain(expected);
    });
  });
});
