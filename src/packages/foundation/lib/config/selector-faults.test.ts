// Colocated unit test for Core's selector validation: the two literal axes, the
// exclusions, a Module's own axis passed in, and the two shared fault shapes.

import { describe, expect, it } from 'vitest';
import {
  axisFaults,
  exclusionFaults,
  invalidValue,
  isStringList,
  selectorMissingFaults,
  tokenFaults,
  unrecognisedKeys,
} from './selector-faults.pure.ts';

const AT = 'section.rules[0]';
const EXCLUDE_AT = `${AT}.excludeFiles`;
const invalid = (location: string) => ({ code: 'CONFIG_INVALID_VALUE', location });
const missing = (location: string) => ({ code: 'CONFIG_SELECTOR_MISSING', location });
const unrecognised = (location: string) => ({ code: 'CONFIG_UNRECOGNISED_KEY', location });

/** A stand-in Module axis: a non-empty list of non-empty strings. */
const EXTRA = { tags: (tokens: readonly string[]) => tokens.length > 0 && tokens.every((token) => token !== '') };

describe('selector faults', () => {
  describe('success cases', () => {
    it('finds nothing in well-formed axes, with or without a Module axis', () => {
      // ARRANGE
      const rule = {
        folders: ['docs/', './'],
        fileNames: ['index.md'],
        tags: ['note'],
        excludeFiles: [{ folders: ['docs/v/'] }],
      };
      const expected = [[], [], [], []];
      // ACT
      const actual = [
        selectorMissingFaults(rule, AT, EXTRA),
        axisFaults(rule, AT, EXTRA),
        tokenFaults(rule, AT, EXTRA),
        exclusionFaults(rule, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts a Module axis alone as a selector, and an empty Core axis as present', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = [
        ...selectorMissingFaults({ tags: ['a'] }, AT, EXTRA),
        ...selectorMissingFaults({ folders: [] }, AT),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names a value outside its type, and each key outside the vocabulary in written order', () => {
      // ARRANGE
      const written = { b: 1, a: 2, toString: 3 };
      const expected = [invalid('x.y'), [unrecognised('x.b'), unrecognised('x.toString')]];
      // ACT
      const actual = [invalidValue('x.y'), unrecognisedKeys(written, { a: true }, 'x')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('finds nothing in an absent, empty or sound excludeFiles', () => {
      // ARRANGE
      const sound = {
        excludeFiles: [{ folders: ['d/'] }, { fileNames: ['a.md'] }, { folders: ['d/'], fileNames: ['a.md'] }],
      };
      const expected = [[], [], []];
      // ACT
      const actual = [{}, { excludeFiles: [] }, sound].map((rule) => exclusionFaults(rule, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a Rule carrying no axis at all', () => {
      // ARRANGE
      const expected = [missing(AT)];
      // ACT
      const actual = [selectorMissingFaults({ intent: 'x' }, AT), selectorMissingFaults({ intent: 'x' }, AT, EXTRA)];
      // ASSERT
      expect(actual).toEqual([expected, expected]);
    });

    it('refuses folder and file-name tokens the grammar rejects, once at the axis', () => {
      // ARRANGE
      const rule = { folders: ['docs', '/a/'], fileNames: ['d/f.md', '..'] };
      // ACT
      const actual = [axisFaults(rule, AT), tokenFaults(rule, AT)];
      // ASSERT
      const expected = [invalid(`${AT}.folders`), invalid(`${AT}.fileNames`)];
      expect(actual).toEqual([expected, expected]);
    });

    it('refuses a Module axis its own judge rejects, after Core axes', () => {
      // ARRANGE
      const rule = { folders: ['docs'], tags: ['ok', ''] };
      const expected = [invalid(`${AT}.folders`), invalid(`${AT}.tags`)];
      // ACT
      const actual = axisFaults(rule, AT, EXTRA);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an excludeFiles that is not a list of mappings, at the key', () => {
      // ARRANGE
      const rules = [{ excludeFiles: 'docs/' }, { excludeFiles: ['docs/'] }];
      const expected = [[invalid(EXCLUDE_AT)], [invalid(EXCLUDE_AT)]];
      // ACT
      const actual = rules.map((rule) => exclusionFaults(rule, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an exclusion axis of the wrong shape, an empty exclusion, and a malformed token, at the key', () => {
      // ARRANGE
      const rules = [
        { excludeFiles: [{ folders: 'docs/' }] },
        { excludeFiles: [{}] },
        { excludeFiles: [{ folders: ['docs'] }] },
      ];
      const expected = [[invalid(EXCLUDE_AT)], [missing(EXCLUDE_AT)], [invalid(EXCLUDE_AT)]];
      // ACT
      const actual = rules.map((rule) => exclusionFaults(rule, AT));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a wrongly shaped axis ahead of an axisless entry, one fault at the key, whichever entry comes first', () => {
      // Core's one order: unrecognised key, wrong shape, no axis, malformed token.
      // body-structure-harness used to report the axisless entry here; it now meets
      // frontmatter-harness's order.
      // ARRANGE
      const shapeThenAxisless = { excludeFiles: [{ folders: 'x' }, {}] };
      const axislessThenShape = { excludeFiles: [{}, { folders: 'x' }] };
      const expected = [[invalid(EXCLUDE_AT)], [invalid(EXCLUDE_AT)]];
      // ACT
      const actual = [exclusionFaults(shapeThenAxisless, AT), exclusionFaults(axislessThenShape, AT)];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a Module axis inside an exclusion as an unrecognised key, since exclusions are Core selectors', () => {
      // ARRANGE
      const rule = { excludeFiles: [{ tags: ['draft'] }] };
      const expected = [unrecognised(`${EXCLUDE_AT}.tags`)];
      // ACT
      const actual = exclusionFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports an unrecognised exclusion key once however many entries carry it, in encounter order', () => {
      // ARRANGE
      const rule = {
        excludeFiles: [
          { folders: ['a/'], filenames: ['a.md'], typo: true },
          { folders: ['b/'], filenames: ['b.md'], extra: 1 },
        ],
      };
      const expected = [
        unrecognised(`${EXCLUDE_AT}.filenames`),
        unrecognised(`${EXCLUDE_AT}.typo`),
        unrecognised(`${EXCLUDE_AT}.extra`),
      ];
      // ACT
      const actual = exclusionFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports only the unrecognised key when an exclusion carries nothing else', () => {
      // ARRANGE
      const rule = { excludeFiles: [{ filenames: ['x.md'] }] };
      const expected = [unrecognised(`${EXCLUDE_AT}.filenames`)];
      // ACT
      const actual = exclusionFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an empty Core axis at the axis, and leaves keys outside the axes alone', () => {
      // ARRANGE
      // An empty list names no folder and no file name, so the Rule would
      // select nothing; leaving the key out is what means every.
      const rule = { folders: [], fileNames: [], intent: 'x', ruleId: 'r' };
      const refused = [invalid(`${AT}.folders`), invalid(`${AT}.fileNames`)];
      const expected = [refused, refused];
      // ACT
      const actual = [axisFaults(rule, AT), tokenFaults(rule, AT)];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an exclusion whose only axis is empty, at the key', () => {
      // ARRANGE
      const rule = { excludeFiles: [{ folders: [] }] };
      const expected = [invalid(EXCLUDE_AT)];
      // ACT
      const actual = exclusionFaults(rule, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a non-list axis once at the axis from axisFaults and not at all from tokenFaults', () => {
      // ARRANGE
      const rule = { folders: 'docs/', tags: [7] };
      const expected = [[invalid(`${AT}.folders`), invalid(`${AT}.tags`)], []];
      // ACT
      const actual = [axisFaults(rule, AT, EXTRA), tokenFaults(rule, AT, EXTRA)];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('tells a list of strings from everything else', () => {
      // ARRANGE
      const values = [[], ['a'], ['a', 1], 'a', undefined];
      const expected = [true, true, false, false, false];
      // ACT
      const actual = values.map(isStringList);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
