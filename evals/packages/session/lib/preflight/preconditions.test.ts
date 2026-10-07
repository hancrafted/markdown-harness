// Colocated unit test for the rung 1 and rung 2 preconditions, which run before
// any session and need no model. A failure is an instrument failure naming the
// rung: the fixture is wrong, not the steering.

import { describe, expect, it } from 'vitest';
import { checkRung1, checkRung2 } from './preconditions.pure.ts';

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
      const problem = checkRung1(stdout, STEERING_MARKER, 'steered');
      // ASSERT
      expect(problem).toBeUndefined();
    });

    it('passes a governed answer holding the steering marker nowhere in the intent-neutralised arm', () => {
      // ARRANGE
      const stdout = governed('nothing');
      // ACT
      const problem = checkRung1(stdout, STEERING_MARKER, 'neutralised');
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
        checkRung1(invisible, STEERING_MARKER, 'steered'),
        checkRung1('nope', STEERING_MARKER, 'steered'),
        checkRung1(twice, STEERING_MARKER, 'steered'),
        checkRung1(governed('x'), STEERING_MARKER, 'steered'),
        checkRung1(governed(STEERING_MARKER), STEERING_MARKER, 'neutralised'),
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
      const problem = checkRung1(stdout, STEERING_MARKER, 'control');
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
      const problem = checkRung2(output, STEERING_MARKER);
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails a silent hook and a notice that lost the steering marker in rendering', () => {
      // ARRANGE
      const lost = notice('markdown-harness: x is a new file, no code here');
      // ACT
      const problems = [checkRung2('', STEERING_MARKER), checkRung2(lost, STEERING_MARKER)];
      // ASSERT
      for (const problem of problems) expect(problem).toMatch(/rung 2/);
    });
  });

  describe('edge cases', () => {
    it('fails output that is not the hook envelope even if it mentions the steering marker', () => {
      // ARRANGE
      const output = `plain text ${STEERING_MARKER}`;
      // ACT
      const problem = checkRung2(output, STEERING_MARKER);
      // ASSERT
      expect(problem).toMatch(/rung 2/);
    });
  });
});
