// Colocated unit test for the Rule-level `vocabulary:` key: its shape, its
// items, its titles, and the two cross-key checks.

import { describe, expect, it } from 'vitest';
import { vocabularyFaults } from './vocabulary-faults.pure.ts';

const AT = 'body-structure.rules[0]';
const ITEM = `${AT}.vocabulary[0]`;

const SIX = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

describe('vocabulary faults', () => {
  describe('success cases', () => {
    it('finds nothing in an absent key, one item, or several items at different levels', () => {
      // ARRANGE
      const expected = [[], [], []];
      // ACT
      const actual = [
        vocabularyFaults({}, AT),
        vocabularyFaults({ vocabulary: [{ level: 3, allowed: SIX }] }, AT),
        vocabularyFaults(
          {
            vocabulary: [
              { level: 3, allowed: ['Example'] },
              { level: 2, allowed: ['Overview'] },
            ],
          },
          AT,
        ),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets one title appear in two different items, because they hold different levels', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = vocabularyFaults(
        {
          vocabulary: [
            { level: 2, allowed: ['Notes'] },
            { level: 3, allowed: ['Notes'] },
          ],
        },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a vocabulary at or above maxLevel and beside entries at other levels', () => {
      // ARRANGE
      const expected = [[], []];
      // ACT
      const actual = [
        vocabularyFaults({ maxLevel: 3, vocabulary: [{ level: 3, allowed: ['A'] }] }, AT),
        vocabularyFaults(
          { vocabulary: [{ level: 3, allowed: ['A'] }], headings: [{ purpose: 'heading', level: 1 }] },
          AT,
        ),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not consult maxLevel beside a closed spine, where maxLevel is already refused', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = vocabularyFaults(
        { maxLevel: 2, undefinedHeadings: 'forbid', vocabulary: [{ level: 3, allowed: ['A'] }] },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a value that is not a list, at the key', () => {
      // ARRANGE
      const expected = Array.from({ length: 4 }, () => [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.vocabulary` },
      ]);
      // ACT
      const actual = [{ level: 3 }, 'Added', null, 3].map((vocabulary) => vocabularyFaults({ vocabulary }, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an empty list as an empty constraint, at the key', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: `${AT}.vocabulary` }];
      // ACT
      const actual = vocabularyFaults({ vocabulary: [] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an item that is not a mapping, at the item', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.vocabulary[0]` },
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.vocabulary[1]` },
      ];
      // ACT
      const actual = vocabularyFaults({ vocabulary: ['Added', [3]] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses any key outside level and allowed, at the key', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${ITEM}.titles` },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${ITEM}.mayHold` },
      ];
      // ACT
      const actual = vocabularyFaults(
        { vocabulary: [{ level: 3, allowed: ['A'], titles: ['B'], mayHold: ['prose'] }] },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a level that is not an integer from 1 to 6, at the level', () => {
      // ARRANGE
      const expected = Array.from({ length: 6 }, () => [{ code: 'CONFIG_INVALID_VALUE', location: `${ITEM}.level` }]);
      // ACT
      const actual = [0, 7, 2.5, '3', null, undefined].map((level) =>
        vocabularyFaults({ vocabulary: [{ level, allowed: ['A'] }] }, AT),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an allowed that is absent or not a list, at the key', () => {
      // ARRANGE
      const expected = Array.from({ length: 3 }, () => [{ code: 'CONFIG_INVALID_VALUE', location: `${ITEM}.allowed` }]);
      // ACT
      const actual = [{ level: 3 }, { level: 3, allowed: 'Added' }, { level: 3, allowed: null }].map((item) =>
        vocabularyFaults({ vocabulary: [item] }, AT),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an empty allowed as an empty constraint, at the key', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: `${ITEM}.allowed` }];
      // ACT
      const actual = vocabularyFaults({ vocabulary: [{ level: 3, allowed: [] }] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a title that is empty, padded or not a string, at the element, in index order', () => {
      // ARRANGE
      const expected = [0, 1, 2, 3, 4].map((index) => ({
        code: 'CONFIG_INVALID_VALUE',
        location: `${ITEM}.allowed[${index}]`,
      }));
      // ACT
      const actual = vocabularyFaults(
        { vocabulary: [{ level: 3, allowed: ['', ' Added', 'Fixed ', 7, null, 'Ok'] }] },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a title a tab or a newline pads, since a heading content never has either', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${ITEM}.allowed[0]` },
        { code: 'CONFIG_INVALID_VALUE', location: `${ITEM}.allowed[1]` },
      ];
      // ACT
      const actual = vocabularyFaults({ vocabulary: [{ level: 3, allowed: ['\tAdded', 'Fixed\n'] }] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a repeated level at the later item, once however often it repeats', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_DUPLICATE_VOCABULARY_LEVEL', location: `${AT}.vocabulary[1].level` },
        { code: 'CONFIG_DUPLICATE_VOCABULARY_LEVEL', location: `${AT}.vocabulary[2].level` },
      ];
      // ACT
      const actual = vocabularyFaults(
        {
          vocabulary: [
            { level: 3, allowed: ['A'] },
            { level: 3, allowed: ['B'] },
            { level: 3, allowed: ['C'] },
          ],
        },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a repeated title at the later occurrence', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_DUPLICATE_VOCABULARY_TITLE', location: `${ITEM}.allowed[2]` },
        { code: 'CONFIG_DUPLICATE_VOCABULARY_TITLE', location: `${ITEM}.allowed[3]` },
      ];
      // ACT
      const actual = vocabularyFaults({ vocabulary: [{ level: 3, allowed: ['A', 'B', 'A', 'A'] }] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a level beyond a valid maxLevel, at the level', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_VOCABULARY_BEYOND_MAX_LEVEL', location: `${ITEM}.level` }];
      // ACT
      const actual = vocabularyFaults({ maxLevel: 2, vocabulary: [{ level: 3, allowed: ['A'] }] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a level some entry also writes, at the vocabulary level and not at the entry', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES', location: `${ITEM}.level` }];
      // ACT
      const actual = vocabularyFaults(
        {
          vocabulary: [{ level: 3, allowed: ['Added'] }],
          headings: [
            { purpose: 'heading', level: 1 },
            { purpose: 'heading', level: 3, pattern: '^Added$' },
          ],
        },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('decides a repeated level over valid levels only, so an invalid level is reported once', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.vocabulary[0].level` },
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.vocabulary[1].level` },
      ];
      // ACT
      const actual = vocabularyFaults(
        {
          vocabulary: [
            { level: 9, allowed: ['A'] },
            { level: 9, allowed: ['B'] },
          ],
        },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('decides a repeated title over valid titles only, so an invalid title is reported once', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: `${ITEM}.allowed[0]` },
        { code: 'CONFIG_INVALID_VALUE', location: `${ITEM}.allowed[1]` },
      ];
      // ACT
      const actual = vocabularyFaults({ vocabulary: [{ level: 3, allowed: [' ', ' '] }] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('stays silent on both cross-key checks when the level it would compare is invalid', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${ITEM}.level` }];
      // ACT
      const actual = vocabularyFaults(
        { maxLevel: 2, vocabulary: [{ level: 8, allowed: ['A'] }], headings: [{ purpose: 'heading', level: 8 }] },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('stays silent on the maxLevel check when maxLevel is invalid', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = vocabularyFaults({ maxLevel: 9, vocabulary: [{ level: 3, allowed: ['A'] }] }, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a malformed headings value as no entries, leaving that fault to the spine', () => {
      // ARRANGE
      const expected = [[], []];
      // ACT
      const actual = [
        vocabularyFaults({ vocabulary: [{ level: 3, allowed: ['A'] }], headings: 'x' }, AT),
        vocabularyFaults({ vocabulary: [{ level: 3, allowed: ['A'] }], headings: ['x', null] }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('walks the list-wide repeated levels, then each item in order: keys, level, allowed, titles, depth, entries', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_DUPLICATE_VOCABULARY_LEVEL', location: `${AT}.vocabulary[1].level` },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.vocabulary[0].extra` },
        { code: 'CONFIG_DUPLICATE_VOCABULARY_TITLE', location: `${AT}.vocabulary[0].allowed[1]` },
        { code: 'CONFIG_VOCABULARY_BEYOND_MAX_LEVEL', location: `${AT}.vocabulary[0].level` },
        { code: 'CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES', location: `${AT}.vocabulary[0].level` },
        { code: 'CONFIG_EMPTY_CONSTRAINT', location: `${AT}.vocabulary[1].allowed` },
        { code: 'CONFIG_VOCABULARY_BEYOND_MAX_LEVEL', location: `${AT}.vocabulary[1].level` },
        { code: 'CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES', location: `${AT}.vocabulary[1].level` },
      ];
      // ACT
      const actual = vocabularyFaults(
        {
          maxLevel: 2,
          headings: [{ purpose: 'heading', level: 3 }],
          vocabulary: [
            { level: 3, allowed: ['A', 'A'], extra: 1 },
            { level: 3, allowed: [] },
          ],
        },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
