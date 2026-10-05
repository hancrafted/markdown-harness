// Colocated unit test for the `mayHold` key of one heading entry: its shape,
// its emptiness, its kinds and the repeats among them.

import { describe, expect, it } from 'vitest';
import { mayHoldFaults } from './block-kind-faults.pure.ts';

const AT = 'body-structure.rules[0].headings[0]';

describe('block kind faults', () => {
  describe('success cases', () => {
    it('finds nothing in an absent key, one kind, or all three kinds in any order', () => {
      // ARRANGE
      const expected = [[], [], []];
      // ACT
      const actual = [
        mayHoldFaults({}, AT),
        mayHoldFaults({ mayHold: ['prose'] }, AT),
        mayHoldFaults({ mayHold: ['unordered-list', 'prose', 'ordered-list'] }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a value that is not a list, at the key, whatever it is', () => {
      // ARRANGE
      const expected = Array.from({ length: 5 }, () => [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.mayHold` }]);
      // ACT
      const actual = ['prose', null, 3, { prose: true }, true].map((mayHold) => mayHoldFaults({ mayHold }, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an empty list as an empty constraint, at the key', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: `${AT}.mayHold` }];
      // ACT
      const actual = mayHoldFaults({ mayHold: [] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses every element outside the three kinds, at the element, in index order', () => {
      // ARRANGE
      const expected = [1, 2, 3, 4].map((index) => ({
        code: 'CONFIG_INVALID_VALUE',
        location: `${AT}.mayHold[${index}]`,
      }));
      // ACT
      const actual = mayHoldFaults({ mayHold: ['prose', 'Prose', 'code', 7, null] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a repeated kind at the later occurrence', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_DUPLICATE_BLOCK_KIND', location: `${AT}.mayHold[2]` },
        { code: 'CONFIG_DUPLICATE_BLOCK_KIND', location: `${AT}.mayHold[3]` },
      ];
      // ACT
      const actual = mayHoldFaults({ mayHold: ['prose', 'ordered-list', 'prose', 'prose'] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports an invalid kind once and never also as a repeat', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.mayHold[0]` },
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.mayHold[1]` },
      ];
      // ACT
      const actual = mayHoldFaults({ mayHold: ['code', 'code'] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists invalid kinds ahead of repeated ones', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.mayHold[1]` },
        { code: 'CONFIG_DUPLICATE_BLOCK_KIND', location: `${AT}.mayHold[2]` },
      ];
      // ACT
      const actual = mayHoldFaults({ mayHold: ['prose', 'code', 'prose'] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('treats an inherited property name as an unknown kind, never a valid one', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.mayHold[0]` }];
      // ACT
      const actual = mayHoldFaults({ mayHold: ['constructor'] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
