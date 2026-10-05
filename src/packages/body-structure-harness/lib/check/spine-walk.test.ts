// Colocated unit test for the spine walk: what each entry of a spine finds in
// one outline, and which entry each leftover heading is given to. Positions are
// indexes into the outline, worked out by hand from the walk's stated rules.

import { describe, expect, it } from 'vitest';
import type { HeadingEntry } from '../../section.ts';
import { matcherFor, walkSpine } from './spine-walk.pure.ts';

/** One outline heading, read off the walk's own signature: this lane imports only its sibling. */
type OutlineHeading = Parameters<typeof walkSpine>[0]['outline'][number];

const heading = (level: number, pattern?: string): HeadingEntry =>
  pattern === undefined ? { purpose: 'heading', level } : { purpose: 'heading', level, pattern };
const enumeration = (level: number, pattern?: string): HeadingEntry =>
  pattern === undefined ? { purpose: 'enumeration', level } : { purpose: 'enumeration', level, pattern };
const h = (level: number, content: string): OutlineHeading => ({ level, content });

/** The walk over one outline, every entry given its own matcher. */
function walk(entries: readonly HeadingEntry[], outline: readonly OutlineHeading[]) {
  return walkSpine({ entries, matchers: entries.map(matcherFor), outline });
}

const found = (claimed: number | undefined, repeats: readonly number[] = [], misplaced = false) => ({
  claimed,
  repeats,
  misplaced,
});

describe('the spine walk', () => {
  describe('success cases', () => {
    it('claims each heading entry in order, moving the cursor past each claim', () => {
      // ARRANGE
      const entries = [heading(1), heading(2, 'Context'), heading(2, 'Decision')];
      const outline = [h(1, 'Title'), h(2, 'Context'), h(2, 'Aside'), h(2, 'Decision')];
      const expected = { findings: [found(0), found(1), found(3)], given: new Map() };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('gives an enumeration the run up to the first heading a later entry matches', () => {
      // ARRANGE
      // The run is positions 1 and 2: `Notes` at 3 is the later entry's, so the
      // enumeration stops there even though nothing between would stop it.
      const entries = [heading(1), enumeration(2, '^\\['), heading(2, 'Notes')];
      const outline = [h(1, 'Changelog'), h(2, '[1.1.0]'), h(2, '[1.0.0]'), h(2, 'Notes')];
      const expected = { findings: [found(0), found(undefined, [1, 2]), found(3)], given: new Map() };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('matches by level and searches the pattern unanchored in the u-flag dialect', () => {
      // ARRANGE
      // `\p{Lu}` is any uppercase letter only under `u`; `Option` is found
      // inside `An Option`, because a pattern is searched rather than anchored.
      const capital = matcherFor(heading(2, '^\\p{Lu}'));
      const option = matcherFor(heading(2, 'Option'));
      const expected = [true, false, true, false];
      // ACT
      const actual = [
        capital(h(2, 'Émile')),
        capital(h(2, 'émile')),
        option(h(2, 'An Option')),
        option(h(3, 'An Option')),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('finds nothing for a heading entry whose title the outline lacks, and calls it missing', () => {
      // ARRANGE
      const entries = [heading(1), heading(2, 'Consequences')];
      const outline = [h(1, 'Title'), h(2, 'Context')];
      const expected = { findings: [found(0), found(undefined)], given: new Map() };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('marks a heading entry misplaced when its only match sits before the cursor', () => {
      // ARRANGE
      // `Context` is claimed at 1 and moves the cursor to 2, so `Status` at 0
      // is behind it: out of order rather than missing, and still a leftover.
      const entries = [heading(2, 'Context'), heading(2, 'Status')];
      const outline = [h(2, 'Status'), h(2, 'Context')];
      const expected = { findings: [found(1), found(undefined, [], true)], given: new Map() };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('gives a second match of a claimed heading entry back to that entry as a repeat', () => {
      // ARRANGE
      const entries = [heading(1), heading(2, 'Context')];
      const outline = [h(1, 'Title'), h(2, 'Context'), h(2, 'Context')];
      const expected = { findings: [found(0), found(1)], given: new Map([[1, 1]]) };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('gives an enumeration the repeats it matches outside its run', () => {
      // ARRANGE
      // The run ends at `Notes` (2); the release at 3 is past it, so it is a
      // leftover, given to the enumeration rather than repeated by `Notes`.
      const entries = [enumeration(2, '^\\['), heading(2, 'Notes')];
      const outline = [h(2, '[1.1.0]'), h(2, 'Unreleased'), h(2, 'Notes'), h(2, '[1.0.0]')];
      const expected = { findings: [found(undefined, [0]), found(2)], given: new Map([[0, 1]]) };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('claims greedily, so an earlier entry takes the first match a later entry also fits', () => {
      // ARRANGE
      // Both entries fit both headings. Greedy means the first takes 0 and the
      // second 1, never a backtracking search for another reading.
      const entries = [heading(2), heading(2, 'B')];
      const outline = [h(2, 'B'), h(2, 'B')];
      const expected = { findings: [found(0), found(1)], given: new Map() };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('gives a leftover no entry matches to nobody', () => {
      // ARRANGE
      const entries = [heading(1)];
      const outline = [h(1, 'Title'), h(3, 'Detail')];
      const expected = { findings: [found(0)], given: new Map() };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets an empty enumeration run leave the cursor where it was', () => {
      // ARRANGE
      // No release before `Notes`, so the enumeration repeats nothing and
      // `Notes` is still found from the same cursor.
      const entries = [heading(1), enumeration(2, '^\\['), heading(2, 'Notes')];
      const outline = [h(1, 'Changelog'), h(2, 'Notes')];
      const expected = { findings: [found(0), found(undefined, []), found(1)], given: new Map() };
      // ACT
      const actual = walk(entries, outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
