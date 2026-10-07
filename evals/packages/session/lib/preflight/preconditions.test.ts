// Colocated unit test for the rung 1 and rung 2 preconditions, which run before
// any session and need no model. A failure is an instrument failure naming the
// rung: the fixture is wrong, not the steering.

import { describe, expect, it } from 'vitest';
import { checkRung1, checkRung2 } from './preconditions.pure.ts';

const MARKER = 'QQ11-2222';
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
    it('passes a governed answer holding the marker exactly once in the steered arm', () => {
      // ARRANGE
      const stdout = governed(`do it ${MARKER}`);
      // ACT
      const problem = checkRung1(stdout, MARKER, 'steered');
      // ASSERT
      expect(problem).toBeUndefined();
    });

    it('passes a governed answer holding the marker nowhere in the intent-neutralised arm', () => {
      // ARRANGE
      const stdout = governed('nothing');
      // ACT
      const problem = checkRung1(stdout, MARKER, 'neutralised');
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails an invisible path, an unparseable answer, and a marker count that is wrong for the arm', () => {
      // ARRANGE
      const invisible = JSON.stringify({ result: { governance: 'invisible' } });
      const twice = governed(`${MARKER} ${MARKER}`);
      // ACT
      const problems = [
        checkRung1(invisible, MARKER, 'steered'),
        checkRung1('nope', MARKER, 'steered'),
        checkRung1(twice, MARKER, 'steered'),
        checkRung1(governed('x'), MARKER, 'steered'),
        checkRung1(governed(MARKER), MARKER, 'neutralised'),
      ];
      // ASSERT
      for (const problem of problems) expect(problem).toMatch(/rung 1/);
    });
  });

  describe('edge cases', () => {
    it('does not require the marker in the control arm, which has no steering content to query', () => {
      // ARRANGE
      const stdout = governed('nothing');
      // ACT
      const problem = checkRung1(stdout, MARKER, 'control');
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });
});

describe('checkRung2', () => {
  describe('success cases', () => {
    it('passes a rendered notice that names the path and carries the marker', () => {
      // ARRANGE
      const output = notice(`markdown-harness: ${TARGET} is a new file ... ${MARKER}`);
      // ACT
      const problem = checkRung2(output, MARKER);
      // ASSERT
      expect(problem).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('fails a silent hook and a notice that lost the marker in rendering', () => {
      // ARRANGE
      const lost = notice('markdown-harness: x is a new file, no code here');
      // ACT
      const problems = [checkRung2('', MARKER), checkRung2(lost, MARKER)];
      // ASSERT
      for (const problem of problems) expect(problem).toMatch(/rung 2/);
    });
  });

  describe('edge cases', () => {
    it('fails output that is not the hook envelope even if it mentions the marker', () => {
      // ARRANGE
      const output = `plain text ${MARKER}`;
      // ACT
      const problem = checkRung2(output, MARKER);
      // ASSERT
      expect(problem).toMatch(/rung 2/);
    });
  });
});
