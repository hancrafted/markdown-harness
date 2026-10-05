// Colocated unit test for the checks judged on a body's outline alone: depth
// (`maxLevel`) and closure (`undefinedHeadings: forbid`), design-ADR 0019 and 0025.

import { describe, expect, it } from 'vitest';
import { levelViolations, undefinedViolations } from './outline-violations.pure.ts';

const TITLE = { level: 1, content: 'Report' };
const ASIDE = { level: 2, content: 'Aside' };
const MATCHES_TITLE = (heading: { level: number }) => heading.level === 1;

describe('outline violations', () => {
  describe('success cases', () => {
    it('reports every heading no matcher accepts, in outline order, with level and raw content', () => {
      // ARRANGE
      const expected = [
        {
          violation: 'BODY_STRUCTURE__HEADING_UNDEFINED',
          level: 2,
          content: 'Aside',
          requirement: { undefinedHeadings: 'forbid' },
        },
      ];
      // ACT
      const actual = undefinedViolations([MATCHES_TITLE], [TITLE, ASIDE]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports one violation per level beyond the limit, counting its headings', () => {
      // ARRANGE
      const expected = [
        { violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP', level: 2, found: 2, requirement: { maxLevel: 1 } },
      ];
      // ACT
      const actual = levelViolations(1, [TITLE, ASIDE, ASIDE]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports every heading as undefined when the spine has no matcher', () => {
      // ARRANGE
      const expected = 2;
      // ACT
      const actual = undefinedViolations([], [TITLE, ASIDE]).length;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('reports nothing for an empty outline or for no limit', () => {
      // ARRANGE
      const expected = [[], []];
      // ACT
      const actual = [undefinedViolations([], []), levelViolations(undefined, [ASIDE])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
