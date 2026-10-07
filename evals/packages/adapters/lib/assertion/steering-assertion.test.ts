// Colocated unit test for the assertion body: presence expected in a hook arm and
// the control arm, absence in the intent-neutralised arm; it names the rung.

import { describe, expect, it } from 'vitest';
import { gradeSteeringAssertion } from './steering-assertion.pure.ts';

const STEERING_MARKER = 'QQ11-2222';
const SCOPE = { level: 2, titlePattern: '^Findings$' };
const out = (finalFile: string | null) => JSON.stringify({ finalFile });
const meta = (arm: string, extra: object = {}) => ({
  arm,
  carriers: [{ address: 'findings', steeringMarker: STEERING_MARKER, scope: SCOPE }],
  localised: 'clean',
  creatingTool: 'Write',
  ...extra,
});
const WITH = `## Findings\nx ${STEERING_MARKER}\n`;

describe('gradeSteeringAssertion', () => {
  describe('success cases', () => {
    it('passes a steered or control trial that carries the steering marker, and a neutralised one that does not', () => {
      // ARRANGE
      const expected = [true, true, true];
      // ACT
      const actual = [
        gradeSteeringAssertion(out(WITH), meta('steered')).pass,
        gradeSteeringAssertion(out(WITH), meta('control')).pass,
        gradeSteeringAssertion(out('## Findings\nx\n'), meta('neutralised')).pass,
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('fails a steered null and names the localised rung in its reason', () => {
      // ARRANGE
      const expected = 'localised: 4';
      // ACT
      const result = gradeSteeringAssertion(out('## Findings\nx\n'), meta('steered', { localised: '4' }));
      // ASSERT
      expect(result.pass).toBe(false);
      expect(result.reason).toContain(expected);
    });

    it('fails a neutralised trial that carries the steering marker, which is a defect in the case', () => {
      // ARRANGE
      const expected = { pass: false, score: 0 };
      // ACT
      const result = gradeSteeringAssertion(out(WITH), meta('neutralised'));
      // ASSERT
      expect(result).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('fails with no specification rather than passing over nothing', () => {
      // ARRANGE
      const expected = 'no steering-marker specification';
      // ACT
      const result = gradeSteeringAssertion(out(WITH), undefined);
      // ASSERT
      expect(result.pass).toBe(false);
      expect(result.reason).toContain(expected);
    });
  });
});

describe('gradeSteeringAssertion over two tested carriers', () => {
  const SECOND = 'RR33-4444';
  const two = (arm: string) => ({
    arm,
    carriers: [
      { address: 'findings', steeringMarker: STEERING_MARKER, scope: SCOPE },
      { address: 'frontmatter', steeringMarker: SECOND, scope: { frontmatter: true } },
    ],
    localised: '9',
    creatingTool: 'Write',
  });
  const BOTH = `---\nd: ${SECOND}\n---\n## Findings\nx ${STEERING_MARKER}\n`;
  const ONE = `---\nd: nope\n---\n## Findings\nx ${STEERING_MARKER}\n`;

  describe('success cases', () => {
    it('passes a steered trial only when both steering markers reached the file', () => {
      // ARRANGE
      const expected = [true, false];
      // ACT
      const actual = [
        gradeSteeringAssertion(out(BOTH), two('steered')).pass,
        gradeSteeringAssertion(out(ONE), two('steered')).pass,
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names which carrier decayed in the reason, the partial-action profile', () => {
      // ARRANGE
      const expected = 'findings: present; frontmatter: absent';
      // ACT
      const result = gradeSteeringAssertion(out(ONE), two('steered'));
      // ASSERT
      expect(result.reason).toContain(expected);
    });

    it('fails a neutralised trial when either steering marker leaked', () => {
      // ARRANGE
      const expected = false;
      // ACT
      const actual = gradeSteeringAssertion(out(ONE), two('neutralised')).pass;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('fails an empty carrier list rather than passing over nothing', () => {
      // ARRANGE
      const expected = 'no steering-marker specification';
      // ACT
      const result = gradeSteeringAssertion(out(BOTH), { arm: 'steered', carriers: [] });
      // ASSERT
      expect(result.reason).toContain(expected);
    });
  });
});
