// Colocated unit test for the `maxLevel` check: levels are open by default and
// forbidding depth is explicit, one violation per level (design-ADR 0017).

import { describe, expect, it } from 'vitest';
import { levelViolations } from './level-depth.pure.ts';

const h = (level: number) => ({ level, content: `L${level}` });

describe('levelViolations', () => {
  describe('success cases', () => {
    it('reports one violation per level beyond the limit, ascending, counting the headings at it', () => {
      // ARRANGE
      const outline = [h(1), h(4), h(3), h(4), h(6)];
      const expected = [
        { violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP', level: 4, found: 2, requirement: { maxLevel: 3 } },
        { violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP', level: 6, found: 1, requirement: { maxLevel: 3 } },
      ];
      // ACT
      const actual = levelViolations(3, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a level beyond the limit even when nothing else is wrong', () => {
      // ARRANGE
      const expected = [
        { violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP', level: 2, found: 1, requirement: { maxLevel: 1 } },
      ];
      // ACT
      const actual = levelViolations(1, [h(1), h(2)]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('permits any depth when the Rule writes no maxLevel', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = levelViolations(undefined, [h(6)]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a heading exactly at the limit', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = levelViolations(2, [h(2)]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
