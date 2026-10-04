// Colocated unit test for the template half of one Rule: its `maxLevel:` and
// its `headings:` spine, walked in design-ADR 0020's order.

import { describe, expect, it } from 'vitest';
import { headingsFaults, maxLevelFaults } from './template-faults.pure.ts';

const AT = 'body-structure.rules[0]';
const ENTRY = `${AT}.headings[0]`;

/** The faults one lone entry carries beside a given `maxLevel`. */
function entryFaults(entry: Record<string, unknown>, maxLevel?: number) {
  return headingsFaults({ headings: [entry], ...(maxLevel === undefined ? {} : { maxLevel }) }, AT);
}

describe('template faults', () => {
  describe('success cases', () => {
    it('finds nothing in a sound spine and a sound maxLevel', () => {
      // ARRANGE
      const rule = {
        maxLevel: 3,
        headings: [
          { purpose: 'heading', level: 1 },
          { purpose: 'heading', level: 2, pattern: '^Findings$', presence: 'optional', intent: 'What was measured.' },
          { purpose: 'enumeration', level: 2, pattern: '^Source: ', minCount: 1, maxCount: 4 },
          { purpose: 'enumeration', level: 3, minCount: 0 },
        ],
      };
      const expected = { maxLevel: [], headings: [] };
      // ACT
      const actual = { maxLevel: maxLevelFaults(rule, AT), headings: headingsFaults(rule, AT) };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('finds nothing in a Rule that writes neither', () => {
      // ARRANGE
      const expected = { maxLevel: [], headings: [] };
      // ACT
      const actual = { maxLevel: maxLevelFaults({}, AT), headings: headingsFaults({}, AT) };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a missing or unknown purpose once, silencing every purpose-dependent check', () => {
      // ARRANGE
      const expected = [
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.purpose` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.purpose` }],
      ];
      // ACT
      const actual = [
        entryFaults({ level: 1, minCount: 1, presence: 'optional' }),
        entryFaults({ purpose: 'step', level: 1, minCount: 1, presence: 'optional' }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a key the purpose forbids, in the order minCount, maxCount, presence', () => {
      // ARRANGE
      const expected = [
        [
          { code: 'CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE', location: `${ENTRY}.minCount` },
          { code: 'CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE', location: `${ENTRY}.maxCount` },
        ],
        [{ code: 'CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE', location: `${ENTRY}.presence` }],
      ];
      // ACT
      const actual = [
        entryFaults({ purpose: 'heading', level: 1, minCount: 1, maxCount: 2 }),
        entryFaults({ purpose: 'enumeration', level: 2, minCount: 1, presence: 'optional' }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an enumeration with no count, inverted counts, and a pinned text', () => {
      // ARRANGE
      const expected = [
        [{ code: 'CONFIG_ENUMERATION_WITHOUT_COUNT', location: ENTRY }],
        [{ code: 'CONFIG_COUNT_BOUNDS_INVERTED', location: ENTRY }],
        [{ code: 'CONFIG_ENUMERATION_PINS_TEXT', location: `${ENTRY}.pattern` }],
      ];
      // ACT
      const actual = [
        entryFaults({ purpose: 'enumeration', level: 2 }),
        entryFaults({ purpose: 'enumeration', level: 2, minCount: 3, maxCount: 2 }),
        entryFaults({ purpose: 'enumeration', level: 2, pattern: '^Findings$', minCount: 1 }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses values outside their types, each once', () => {
      // ARRANGE
      const expected = [
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.level` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.pattern` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.pattern` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.presence` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.minCount` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${ENTRY}.maxCount` }],
      ];
      // ACT
      const actual = [
        entryFaults({ purpose: 'heading', level: 7 }),
        entryFaults({ purpose: 'heading', level: 1, pattern: '(unclosed' }),
        entryFaults({ purpose: 'heading', level: 1, pattern: '^Source\\-' }),
        entryFaults({ purpose: 'heading', level: 1, presence: 'forbidden' }),
        entryFaults({ purpose: 'enumeration', level: 2, minCount: 1.5, maxCount: 2 }),
        entryFaults({ purpose: 'enumeration', level: 2, maxCount: 0 }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an entry deeper than maxLevel, only when both are valid', () => {
      // ARRANGE
      const expected = [[{ code: 'CONFIG_ENTRY_BEYOND_MAX_LEVEL', location: `${ENTRY}.level` }], []];
      // ACT
      const actual = [
        entryFaults({ purpose: 'heading', level: 2 }, 1),
        headingsFaults({ maxLevel: 9, headings: [{ purpose: 'heading', level: 2 }] }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an unrecognised key, a blank intent and a maxLevel outside 1 to 6', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${ENTRY}.title` },
        { code: 'CONFIG_EMPTY_INTENT', location: `${ENTRY}.intent` },
        { code: 'CONFIG_INVALID_VALUE', location: `${AT}.maxLevel` },
      ];
      // ACT
      const actual = [
        ...entryFaults({ purpose: 'heading', level: 1, title: 'x', intent: '' }),
        ...maxLevelFaults({ maxLevel: 7 }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses an empty headings list at the list, and a headings value that is no list', () => {
      // ARRANGE
      const expected = [
        [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: `${AT}.headings` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.headings` }],
        [{ code: 'CONFIG_INVALID_VALUE', location: ENTRY }],
      ];
      // ACT
      const actual = [
        headingsFaults({ headings: [] }, AT),
        headingsFaults({ headings: 'none' }, AT),
        headingsFaults({ headings: ['x'] }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('stops deciding an entry beyond maxLevel once forbid has excluded maxLevel, and still decides it beside allow', () => {
      // ARRANGE
      const entries = [{ purpose: 'heading', level: 4 }];
      const expected = [[], [{ code: 'CONFIG_ENTRY_BEYOND_MAX_LEVEL', location: `${ENTRY}.level` }]];
      // ACT
      const actual = [
        headingsFaults({ maxLevel: 2, undefinedHeadings: 'forbid', headings: entries }, AT),
        headingsFaults({ maxLevel: 2, undefinedHeadings: 'allow', headings: entries }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('still decides an entry beyond a valid maxLevel when undefinedHeadings is invalid, which excludes nothing', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_ENTRY_BEYOND_MAX_LEVEL', location: `${ENTRY}.level` }];
      // ACT
      const actual = headingsFaults(
        { maxLevel: 2, undefinedHeadings: 'Forbid', headings: [{ purpose: 'heading', level: 4 }] },
        AT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses undefinedHeadings as an entry key: it is a Rule key', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${ENTRY}.undefinedHeadings` }];
      // ACT
      const actual = entryFaults({ purpose: 'heading', level: 1, undefinedHeadings: 'forbid' });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
