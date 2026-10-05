// Colocated unit test for the checks judged on a body's outline and the lists
// walked over it: depth (`maxLevel`), and closure (`undefinedHeadings: forbid`),
// which asks every list whose stretch holds a heading whether one of its
// entries matches it.

import { describe, expect, it } from 'vitest';
import { levelViolations, unlistedViolations } from './outline-violations.pure.ts';

/** One walked list, as `unlistedViolations` takes it. */
type WalkedSpine = Parameters<typeof unlistedViolations>[0]['scopes'][number];

const TITLE = { level: 1, content: 'Report' };
const ASIDE = { level: 2, content: 'Aside' };
const h3 = (content: string) => ({ level: 3, content });
const MATCHES_TITLE = (heading: { level: number }) => heading.level === 1;
const MATCHES_H2 = (heading: { level: number }) => heading.level === 2;
const MATCHES_H3 = (heading: { level: number }) => heading.level === 3;

/** One walked list over `outline` from `start` to its end, with the given matchers; the walk itself is never read here. */
const scope = (
  outline: readonly { level: number; content: string }[],
  matchers: readonly ((heading: { level: number }) => boolean)[],
  start = 0,
): WalkedSpine => ({
  prefix: [],
  start,
  spine: { entries: [], matchers, outline: outline.slice(start) },
  walk: { findings: [], given: new Map() },
});

const undefinedHeading = (level: number, content: string) => ({
  violation: 'BODY_STRUCTURE__HEADING_UNDEFINED',
  level,
  content,
  requirement: { undefinedHeadings: 'forbid' },
});

describe('outline violations', () => {
  describe('success cases', () => {
    it('reports every heading no matcher accepts, in outline order, with level and raw content', () => {
      // ARRANGE
      const outline = [TITLE, ASIDE];
      const expected = [undefinedHeading(2, 'Aside')];
      // ACT
      const actual = unlistedViolations({ closed: true, scopes: [scope(outline, [MATCHES_TITLE])] }, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts a heading as defined when a nested list whose stretch holds it matches it', () => {
      // ARRANGE
      const outline = [TITLE, h3('Added')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = unlistedViolations(
        { closed: true, scopes: [scope(outline, [MATCHES_TITLE]), scope(outline, [MATCHES_H3], 1)] },
        outline,
      );
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
    it('reports a heading outside every stretch whose list could match it, though a list elsewhere would', () => {
      // ARRANGE
      const outline = [TITLE, h3('Stray'), ASIDE, h3('Added')];
      const expected = [undefinedHeading(3, 'Stray')];
      // ACT
      const actual = unlistedViolations(
        { closed: true, scopes: [scope(outline, [MATCHES_TITLE, MATCHES_H2]), scope(outline, [MATCHES_H3], 3)] },
        outline,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports two headings of the same level and content as two violations', () => {
      // ARRANGE
      const outline = [h3('X'), h3('X')];
      const expected = 2;
      // ACT
      const actual = unlistedViolations({ closed: true, scopes: [scope(outline, [])] }, outline).length;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('reports nothing on an open spine, for an empty outline, or for no limit', () => {
      // ARRANGE
      const expected = [[], [], []];
      // ACT
      const actual = [
        unlistedViolations({ closed: false, scopes: [scope([ASIDE], [])] }, [ASIDE]),
        unlistedViolations({ closed: true, scopes: [scope([], [])] }, []),
        levelViolations(undefined, [ASIDE]),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
