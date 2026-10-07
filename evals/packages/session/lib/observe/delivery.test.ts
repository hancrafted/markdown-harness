// Colocated unit test for finding the moment steering content arrived, by channel: a hook response holding every
// steering marker for push, a query result holding every steering marker without error for pull, and nothing for
// the user turn, whose content is not an event in the stream.

import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '../../session-stream.ts';
import { QUERY_COMMAND, findDelivery, queryCalls, resultOf } from './delivery.pure.ts';

const FIRST = 'QQ11-2222';
const SECOND = 'RR33-4444';
const TARGET = 'docs/research/a.md';
const hook = (seq: number, output: string): SessionEvent => ({
  seq,
  kind: 'hook-response',
  hookName: 'PreToolUse:Write',
  output,
});
const ask = (seq: number, command: string): SessionEvent => ({
  seq,
  kind: 'tool-call',
  id: `q${seq}`,
  tool: 'Bash',
  input: { command },
});
const answer = (seq: number, text: string, isError = false): SessionEvent => ({
  seq,
  kind: 'tool-result',
  id: `q${seq - 1}`,
  isError,
  text,
});

describe('findDelivery', () => {
  describe('success cases', () => {
    it('finds a push delivery in the hook response that holds every steering marker, with the path its notice names', () => {
      // ARRANGE
      const events = [hook(1, `markdown-harness: ${TARGET} is a new file ${FIRST} ${SECOND}`)];
      const expected = { seq: 1, path: TARGET };
      // ACT
      const found = findDelivery(events, 'push', [FIRST, SECOND]);
      // ASSERT
      expect(found).toEqual(expected);
    });

    it('finds a pull delivery in the result of a query that returned every steering marker, naming the path asked', () => {
      // ARRANGE
      const events = [ask(1, `bin/mh query --json ${TARGET}`), answer(2, `${FIRST} ${SECOND}`)];
      const expected = { seq: 2, path: TARGET };
      // ACT
      const found = findDelivery(events, 'pull', [FIRST, SECOND]);
      // ASSERT
      expect(found).toEqual(expected);
    });

    it('finds an assess delivery in a hook response holding every steering marker, naming the path it was about', () => {
      // ARRANGE
      const notice = `markdown-harness: ${TARGET} is past its stale_after under Module "frontmatter". ${FIRST}`;
      const events = [hook(1, JSON.stringify({ hookSpecificOutput: { additionalContext: notice } }))];
      const expected = { seq: 1, path: TARGET };
      // ACT
      const found = findDelivery(events, 'assess', [FIRST]);
      // ASSERT
      expect(found).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('finds no delivery when a response holds only some of the steering markers', () => {
      // ARRANGE
      const events = [hook(1, `notice ${FIRST}`), ask(2, `bin/mh query ${TARGET}`), answer(3, FIRST)];
      // ACT
      const found = [findDelivery(events, 'push', [FIRST, SECOND]), findDelivery(events, 'pull', [FIRST, SECOND])];
      // ASSERT
      expect(found).toEqual([undefined, undefined]);
    });

    it('finds no delivery in a query result that was an error, nor in a hook for a pull channel', () => {
      // ARRANGE
      const events = [hook(1, FIRST), ask(2, `bin/mh query ${TARGET}`), answer(3, FIRST, true)];
      // ACT
      const found = findDelivery(events, 'pull', [FIRST]);
      // ASSERT
      expect(found).toBeUndefined();
    });

    it('finds no assess delivery in a response that lacks the steering marker', () => {
      // ARRANGE
      const events = [hook(1, `markdown-harness: ${TARGET} is past its stale_after`)];
      // ACT
      const found = findDelivery(events, 'assess', [FIRST]);
      // ASSERT
      expect(found).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('finds nothing for the user turn, whose content is not an event in the stream', () => {
      // ARRANGE
      const events = [hook(1, FIRST), ask(2, `bin/mh query ${TARGET}`), answer(3, FIRST)];
      // ACT
      const found = findDelivery(events, 'user-turn', [FIRST]);
      // ASSERT
      expect(found).toBeUndefined();
    });

    it('leaves the path undefined when the notice does not say which path it was about', () => {
      // ARRANGE
      const events = [hook(1, `a notice ${FIRST}`)];
      // ACT
      const found = findDelivery(events, 'push', [FIRST]);
      // ASSERT
      expect(found?.path).toBeUndefined();
    });
  });
});

describe('queryCalls and resultOf', () => {
  describe('success cases', () => {
    it('lists the shell calls that ran the query command and pairs each with its result', () => {
      // ARRANGE
      const events = [ask(1, `bin/mh query ${TARGET}`), answer(2, 'ok'), ask(3, 'ls')];
      const expected = [1, 2];
      // ACT
      const calls = queryCalls(events);
      const result = resultOf(events, calls[0]!);
      // ASSERT
      expect([calls[0]?.seq, result?.seq]).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('lists no call for a command that only mentions the word query', () => {
      // ARRANGE
      const events = [ask(1, 'echo query'), ask(2, 'ls docs')];
      // ACT
      const calls = queryCalls(events);
      // ASSERT
      expect(calls).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('pairs a call whose result never came with nothing, and matches the one query pattern', () => {
      // ARRANGE
      const events = [ask(1, `./bin/mh query ${TARGET}`)];
      const dotted = './bin/mh query x';
      // ACT
      const calls = queryCalls(events);
      // ASSERT
      expect([resultOf(events, calls[0]!), QUERY_COMMAND.test(dotted)]).toEqual([undefined, true]);
    });
  });
});
