// Colocated unit test for the assertion body: presence expected in a hook arm and
// the control arm, absence in the intent-neutralised arm; it names the rung.

import { describe, expect, it } from 'vitest';
import { gradeSteeringAssertion } from './steering-assertion.pure.ts';

const MARKER = 'QQ11-2222';
const SCOPE = { level: 2, titlePattern: '^Findings$' };
const out = (finalFile: string | null) => JSON.stringify({ finalFile });
const meta = (arm: string, extra: object = {}) => ({
  arm,
  marker: MARKER,
  scope: SCOPE,
  localised: 'clean',
  creatingTool: 'Write',
  ...extra,
});
const WITH = `## Findings\nx ${MARKER}\n`;

describe('gradeSteeringAssertion', () => {
  describe('success cases', () => {
    it('passes a steered or control trial that carries the marker, and a neutralised one that does not', () => {
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

    it('fails a neutralised trial that carries the marker, which is a defect in the case', () => {
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
