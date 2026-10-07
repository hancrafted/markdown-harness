// Colocated unit test for the rung 1 and rung 2 preconditions, which run before
// any session and need no model. A failure is an instrument failure naming the
// rung: the fixture is wrong, not the steering.

import { describe, expect, it } from 'vitest';
import { checkPullAnswer, checkRung1, checkRung2, pullFailureKind } from './preconditions.pure.ts';

const STEERING_MARKER = 'QQ11-2222';
const TARGET = 'docs/research/a.md';
const governed = (carrier: string) =>
  JSON.stringify({
    result: {
      governance: 'governed',
      modules: [{ module: 'body-structure', requirements: { headings: [{ intent: carrier }] } }],
    },
  });
const notice = (text: string) =>
  JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: text } });

describe('checkRung1', () => {
  describe('success cases', () => {
    it('passes a governed answer holding the steering marker exactly once in the steered arm', () => {
      // ARRANGE
      const stdout = governed(`do it ${STEERING_MARKER}`);
      // ACT
      const problem = checkRung1(stdout, [STEERING_MARKER], 'steered');
      // ASSERT
      expect(problem).toBeUndefined();
    });

    it('passes a governed answer holding the steering marker nowhere in the intent-neutralised arm', () => {
      // ARRANGE
      const stdout = governed('nothing');
      // ACT
      const problem = checkRung1(stdout, [STEERING_MARKER], 'neutralised');
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails an invisible path, an unparseable answer, and a steering marker count that is wrong for the arm', () => {
      // ARRANGE
      const invisible = JSON.stringify({ result: { governance: 'invisible' } });
      const twice = governed(`${STEERING_MARKER} ${STEERING_MARKER}`);
      // ACT
      const problems = [
        checkRung1(invisible, [STEERING_MARKER], 'steered'),
        checkRung1('nope', [STEERING_MARKER], 'steered'),
        checkRung1(twice, [STEERING_MARKER], 'steered'),
        checkRung1(governed('x'), [STEERING_MARKER], 'steered'),
        checkRung1(governed(STEERING_MARKER), [STEERING_MARKER], 'neutralised'),
      ];
      // ASSERT
      for (const problem of problems) expect(problem).toMatch(/rung 1/);
    });
  });

  describe('edge cases', () => {
    it('does not require the steering marker in the control arm, which has no steering content to query', () => {
      // ARRANGE
      const stdout = governed('nothing');
      // ACT
      const problem = checkRung1(stdout, [STEERING_MARKER], 'control');
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });
});

describe('checkRung2', () => {
  describe('success cases', () => {
    it('passes a rendered notice that names the path and carries the steering marker', () => {
      // ARRANGE
      const output = notice(`markdown-harness: ${TARGET} is a new file ... ${STEERING_MARKER}`);
      // ACT
      const problem = checkRung2(output, [STEERING_MARKER]);
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails a silent hook and a notice that lost the steering marker in rendering', () => {
      // ARRANGE
      const lost = notice('markdown-harness: x is a new file, no code here');
      // ACT
      const problems = [checkRung2('', [STEERING_MARKER]), checkRung2(lost, [STEERING_MARKER])];
      // ASSERT
      for (const problem of problems) expect(problem).toMatch(/rung 2/);
    });
  });

  describe('edge cases', () => {
    it('fails output that is not the hook envelope even if it mentions the steering marker', () => {
      // ARRANGE
      const output = `plain text ${STEERING_MARKER}`;
      // ACT
      const problem = checkRung2(output, [STEERING_MARKER]);
      // ASSERT
      expect(problem).toMatch(/rung 2/);
    });
  });
});

const SECOND_MARKER = 'RR33-4444';

describe('checkRung1 with two tested carriers', () => {
  describe('success cases', () => {
    it('passes an answer holding each steering marker exactly once in the steered arm', () => {
      // ARRANGE
      const stdout = governed(`${STEERING_MARKER} and ${SECOND_MARKER}`);
      // ACT
      const problem = checkRung1(stdout, [STEERING_MARKER, SECOND_MARKER], 'steered');
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails an answer that lost one of the two steering markers', () => {
      // ARRANGE
      const stdout = governed(STEERING_MARKER);
      // ACT
      const problem = checkRung1(stdout, [STEERING_MARKER, SECOND_MARKER], 'steered');
      // ASSERT
      expect(problem).toMatch(/rung 1: the answer holds a steering marker 0 times, expected 1/);
    });
  });

  describe('edge cases', () => {
    it('passes an intent-neutralised answer that holds neither steering marker, and fails one that holds the second', () => {
      // ARRANGE
      const expected = [undefined, /rung 1/];
      // ACT
      const actual = [
        checkRung1(governed('x'), [STEERING_MARKER, SECOND_MARKER], 'neutralised'),
        checkRung1(governed(SECOND_MARKER), [STEERING_MARKER, SECOND_MARKER], 'neutralised'),
      ];
      // ASSERT
      expect(actual[0]).toBe(expected[0]);
      expect(actual[1]).toMatch(expected[1] as RegExp);
    });
  });
});

describe('checkPullAnswer', () => {
  describe('success cases', () => {
    it('passes output holding the steering marker once in the steered arm and nowhere in the intent-neutralised arm', () => {
      // ARRANGE
      const expected = [undefined, undefined];
      // ACT
      const actual = [
        checkPullAnswer(`do it ${STEERING_MARKER}`, [STEERING_MARKER], 'steered'),
        checkPullAnswer('do nothing', [STEERING_MARKER], 'neutralised'),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('fails empty output, a steered answer without the steering marker, and a neutralised answer with it', () => {
      // ARRANGE
      const expected = /pull command/;
      // ACT
      const problems = [
        checkPullAnswer('  ', [STEERING_MARKER], 'steered'),
        checkPullAnswer('plain', [STEERING_MARKER], 'steered'),
        checkPullAnswer(STEERING_MARKER, [STEERING_MARKER], 'neutralised'),
      ];
      // ASSERT
      for (const problem of problems) expect(problem).toMatch(expected);
    });
  });

  describe('edge cases', () => {
    it('fails a steered answer that holds the steering marker twice', () => {
      // ARRANGE
      const twice = `${STEERING_MARKER} ${STEERING_MARKER}`;
      const expected = /times, expected 1/;
      // ACT
      const problem = checkPullAnswer(twice, [STEERING_MARKER], 'steered');
      // ASSERT
      expect(problem).toMatch(expected);
    });
  });
});

describe('pullFailureKind', () => {
  describe('success cases', () => {
    it('names a failing raw JSON answer rung 1, because the answer itself failed', () => {
      // ARRANGE
      const expected = 'rung-1-failed';
      // ACT
      const kind = pullFailureKind('json');
      // ASSERT
      expect(kind).toBe(expected);
    });

    it('names a failing prose rendering rung 2, because it was lost in rendering', () => {
      // ARRANGE
      const expected = 'rung-2-failed';
      // ACT
      const kind = pullFailureKind('prose');
      // ASSERT
      expect(kind).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('does not call an intent-only failure rung 2, which that encoding has none of', () => {
      // ARRANGE
      const notRung2 = 'rung-2-failed';
      // ACT
      const kind = pullFailureKind('intent-only');
      // ASSERT
      expect(kind).not.toBe(notRung2);
    });
  });

  describe('edge cases', () => {
    it('names an intent-only failure an instrument failure of the pull answer itself', () => {
      // ARRANGE
      const expected = 'pull-answer-failed';
      // ACT
      const kind = pullFailureKind('intent-only');
      // ASSERT
      expect(kind).toBe(expected);
    });
  });
});
