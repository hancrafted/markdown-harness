// Colocated unit test for the checks judged on a body's outline alone: depth
// (`maxLevel`), closure (`undefinedHeadings: forbid`) and the heading
// vocabulary, design-ADR 0019, 0025 and 0027.

import { describe, expect, it } from 'vitest';
import { levelViolations, unlistedViolations } from './outline-violations.pure.ts';

const TITLE = { level: 1, content: 'Report' };
const ASIDE = { level: 2, content: 'Aside' };
const MATCHES_TITLE = (heading: { level: number }) => heading.level === 1;
const FORBID = { closed: true, vocabulary: [], matchers: [MATCHES_TITLE] };
const THREE = { level: 3, allowed: ['Added', 'Fixed'] };
const h3 = (content: string) => ({ level: 3, content });

describe('outline violations', () => {
  describe('success cases', () => {
    it('reports a heading outside the vocabulary of its level, once, with the item verbatim', () => {
      // ARRANGE
      const expected = [
        {
          violation: 'BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY',
          level: 3,
          content: 'Improved',
          requirement: THREE,
        },
      ];
      // ACT
      const actual = unlistedViolations({ closed: false, vocabulary: [THREE], matchers: [] }, [
        h3('Added'),
        h3('Improved'),
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('admits a title anywhere, any number of times, in any order', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = unlistedViolations({ closed: false, vocabulary: [THREE], matchers: [] }, [
        h3('Fixed'),
        h3('Added'),
        h3('Fixed'),
        h3('Fixed'),
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports undefined and out-of-vocabulary headings together, in document order whatever their level', () => {
      // ARRANGE
      const expected = ['Detail', 'Improved', 'Aside'];
      // ACT
      const actual = unlistedViolations({ ...FORBID, vocabulary: [THREE] }, [
        TITLE,
        { level: 4, content: 'Detail' },
        h3('Improved'),
        ASIDE,
        h3('Added'),
      ]).map((violation) => ('content' in violation ? violation.content : undefined));
      // ASSERT
      expect(actual).toEqual(expected);
    });

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
      const actual = unlistedViolations(FORBID, [TITLE, ASIDE]);
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
    it.each([
      ['a different case', 'added'],
      ['a substring', 'Add'],
      ['a superstring', 'Added things'],
      ['inline markup', '**Added**'],
      ['an empty title', ''],
    ])('reports %s as outside the vocabulary: matching is whole, exact and case-sensitive', (_name, content) => {
      // ARRANGE
      const expected = ['BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY'];
      // ACT
      const actual = unlistedViolations({ closed: false, vocabulary: [THREE], matchers: [] }, [h3(content)]).map(
        ({ violation }) => violation,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a heading outside the vocabulary once under a closed spine, as outside the vocabulary and never as undefined', () => {
      // ARRANGE
      const expected = ['BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY'];
      // ACT
      const actual = unlistedViolations({ ...FORBID, vocabulary: [THREE] }, [h3('Improved')]).map(
        ({ violation }) => violation,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports two headings of the same level and content as two violations', () => {
      // ARRANGE
      const expected = 2;
      // ACT
      const actual = unlistedViolations({ closed: false, vocabulary: [THREE], matchers: [] }, [
        h3('X'),
        h3('X'),
      ]).length;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reports every heading as undefined when the spine has no matcher', () => {
      // ARRANGE
      const expected = 2;
      // ACT
      const actual = unlistedViolations({ ...FORBID, matchers: [] }, [TITLE, ASIDE]).length;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('counts a heading a vocabulary admits as claimed, so a closed spine never calls it undefined', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = unlistedViolations({ ...FORBID, vocabulary: [THREE] }, [TITLE, h3('Added'), h3('Fixed')]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('leaves a level the vocabulary does not name to the closure, or to nobody on an open spine', () => {
      // ARRANGE
      const expected = [['BODY_STRUCTURE__HEADING_UNDEFINED'], []];
      // ACT
      const actual = [
        unlistedViolations({ ...FORBID, vocabulary: [THREE] }, [ASIDE]).map(({ violation }) => violation),
        unlistedViolations({ closed: false, vocabulary: [THREE], matchers: [] }, [ASIDE]),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('holds each level to its own item', () => {
      // ARRANGE
      const expected = ['Sample', 'Install'];
      // ACT
      const actual = unlistedViolations(
        { closed: false, vocabulary: [THREE, { level: 2, allowed: ['Overview'] }], matchers: [] },
        [h3('Added'), { level: 3, content: 'Sample' }, { level: 2, content: 'Install' }],
      ).map((violation) => ('content' in violation ? violation.content : undefined));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports nothing for an empty outline or for no limit', () => {
      // ARRANGE
      const expected = [[], []];
      // ACT
      const actual = [unlistedViolations(FORBID, []), levelViolations(undefined, [ASIDE])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
