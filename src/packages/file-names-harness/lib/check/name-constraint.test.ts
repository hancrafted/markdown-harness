// Colocated unit test for the one constraint tier that serves both subjects.
//
// A declared part and a whole stem are judged by the identical function, so
// every case here is a claim about both shapes at once.

import { describe, expect, it } from 'vitest';
import type { NameRequirement } from '../../../response-contract/index.ts';
import { nameViolations } from './name-constraint.pure';

/** The requirement a caller assembles; its contents are irrelevant to this tier. */
const REQUIREMENT: NameRequirement = { declared: { name: 'slug' } };

/** Every code reported for one value under one constraint object. */
function codesFor(value: string, constraints: Parameters<typeof nameViolations>[1]): readonly string[] {
  return nameViolations({ segment: 'file.slug', value }, constraints, REQUIREMENT).map((one) => one.violation);
}

describe('name constraints', () => {
  describe('success cases', () => {
    it('reports nothing when every constraint is satisfied', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = codesFor('llm-wiki', { minLength: 3, maxLength: 20, format: 'kebab-case' });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports nothing when the constraint object asks for nothing', () => {
      // A subject that constrains nothing is a config error caught at load, so
      // reaching here means validation let it through — and the right answer is
      // still silence rather than an invented finding.
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = codesFor('anything at all', {});
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a value sitting exactly on both length bounds', () => {
      // Both bounds are INCLUSIVE, and the boundary is the value a
      // reimplementation is most likely to get wrong by one.
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = codesFor('abcd', { minLength: 4, maxLength: 4 });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('separates too short from too long, because the repairs are opposite', () => {
      // ARRANGE
      const expectedShort = ['FILE_NAMES__VALUE_TOO_SHORT'];
      const expectedLong = ['FILE_NAMES__VALUE_TOO_LONG'];
      // ACT
      const short = codesFor('ab', { minLength: 3 });
      const long = codesFor('abcdef', { maxLength: 3 });
      // ASSERT
      expect(short).toEqual(expectedShort);
      expect(long).toEqual(expectedLong);
    });

    it('reports a format mismatch against a named format', () => {
      // ARRANGE
      const expected = ['FILE_NAMES__FORMAT_MISMATCH'];
      // ACT
      const actual = codesFor('LLM_Wiki', { format: 'kebab-case' });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a pattern mismatch separately from a format one', () => {
      // Two codes because the fixes differ: one is a named shape a reader can
      // look up, the other is the Operator's own sentence.
      // ARRANGE
      const expected = ['FILE_NAMES__PATTERN_MISMATCH'];
      // ACT
      const actual = codesFor('mh63', { pattern: '^[a-z]+-[0-9]+$' });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports membership failure against a closed set', () => {
      // ARRANGE
      const expected = ['FILE_NAMES__VALUE_NOT_ALLOWED'];
      // ACT
      const actual = codesFor('wiki', { allowed: [{ value: 'aikb' }, { value: 'okf' }] });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports every failing constraint on one value, in tier order', () => {
      // Length, then shape, then membership — the frontmatter Module's own
      // reporting order minus the presence tier it opens with. Every failing
      // constraint reports rather than stopping at the first.
      // ARRANGE
      const expected = [
        'FILE_NAMES__VALUE_TOO_LONG',
        'FILE_NAMES__FORMAT_MISMATCH',
        'FILE_NAMES__PATTERN_MISMATCH',
        'FILE_NAMES__VALUE_NOT_ALLOWED',
      ];
      // ACT
      const actual = codesFor('Wildly_Wrong_Value', {
        maxLength: 4,
        format: 'kebab-case',
        pattern: '^[0-9]+$',
        allowed: [{ value: 'aikb' }],
      });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries the value found on every finding, so a report never has to guess', () => {
      // ARRANGE
      const expected = 'LLM_Wiki';
      // ACT
      const [violation] = nameViolations(
        { segment: 'file.slug', value: 'LLM_Wiki' },
        { format: 'kebab-case' },
        REQUIREMENT,
      );
      // ASSERT
      expect(violation.value).toBe(expected);
    });

    it('never reports a shape collision, because a part is a string by construction', () => {
      // `CONSTRAINT_SHAPE_MISMATCH` — the one code addressed to the Operator — is
      // unreachable in this Module, and this is what makes the catalog seven
      // rather than eight. A list constraint cannot be written here at all: the
      // type has no `minItems`, so there is nothing to collide.
      // ARRANGE
      const codes = codesFor('anything', { maxLength: 1, format: 'kebab-case' });
      const collision = 'CONSTRAINT_SHAPE_MISMATCH';
      // ACT
      const collided = codes.filter((code) => code.includes(collision));
      // ASSERT
      expect(collided).toEqual([]);
    });

    it('judges an empty value rather than passing it over', () => {
      // A blank frontmatter field is `presence`'s business and never reaches the
      // grammar. A name has no presence tier, so an empty part IS judged — and
      // in practice it never arrives, because an empty part does not count.
      // ARRANGE
      const expected = ['FILE_NAMES__VALUE_TOO_SHORT', 'FILE_NAMES__FORMAT_MISMATCH'];
      // ACT
      const actual = codesFor('', { minLength: 1, format: 'kebab-case' });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
