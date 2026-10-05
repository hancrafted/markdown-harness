// Colocated unit test for the two keys that close a spine: the `undefinedHeadings:`
// value set and its exclusion of `maxLevel:`.

import { describe, expect, it } from 'vitest';
import { closedSpineFaults, undefinedHeadingsFaults } from './closed-spine-faults.pure.ts';

const AT = 'body-structure.rules[0]';

describe('closed spine faults', () => {
  describe('success cases', () => {
    it('finds nothing in allow, forbid or an absent key', () => {
      // ARRANGE
      const expected = [[], [], []];
      // ACT
      const actual = [
        undefinedHeadingsFaults({ undefinedHeadings: 'allow' }, AT),
        undefinedHeadingsFaults({ undefinedHeadings: 'forbid' }, AT),
        undefinedHeadingsFaults({}, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('finds no exclusion in maxLevel beside allow, beside no key, or forbid beside no maxLevel', () => {
      // ARRANGE
      const expected = [[], [], []];
      // ACT
      const actual = [
        closedSpineFaults({ maxLevel: 3, undefinedHeadings: 'allow' }, AT),
        closedSpineFaults({ maxLevel: 3 }, AT),
        closedSpineFaults({ undefinedHeadings: 'forbid' }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses every value but the two spellings, at the key, once', () => {
      // ARRANGE
      const expected = Array.from({ length: 8 }, () => [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.undefinedHeadings` },
      ]);
      // ACT
      const actual = ['Forbid', 'forbidden', 'ALLOW', true, false, ['forbid'], 1, null].map((undefinedHeadings) =>
        undefinedHeadingsFaults({ undefinedHeadings }, AT),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses maxLevel beside forbid at maxLevel', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_MAX_LEVEL_ON_CLOSED_SPINE', location: `${AT}.maxLevel` }];
      // ACT
      const actual = closedSpineFaults({ maxLevel: 3, undefinedHeadings: 'forbid' }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('decides the exclusion only when both keys are valid, so one mistake is one fault', () => {
      // ARRANGE
      const expected = [[], [], []];
      // ACT
      const actual = [
        closedSpineFaults({ maxLevel: 9, undefinedHeadings: 'forbid' }, AT),
        closedSpineFaults({ maxLevel: 3, undefinedHeadings: 'Forbid' }, AT),
        closedSpineFaults({ maxLevel: 0, undefinedHeadings: 'forbid' }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
