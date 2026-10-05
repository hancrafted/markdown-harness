// Colocated unit test for the nested walk: which lists are walked, over which
// stretch of the outline, in which order, and where each sits in the config.

import { describe, expect, it } from 'vitest';
import type { HeadingEntry } from '../../section.ts';
import { endOfHeadingsUnder, walkNested } from './nested-walk.pure.ts';

const h = (level: number, content: string) => ({ level, content });

/** What a walked list is located by, and the contents of its stretch, so a test reads where each list ran. */
const shapeOf = (entries: readonly HeadingEntry[], outline: readonly { level: number; content: string }[]) =>
  walkNested(entries, outline).map(({ prefix, under, spine }) => ({
    prefix,
    under,
    stretch: spine.outline.map(({ content }) => content),
  }));

describe('the nested walk', () => {
  describe('success cases', () => {
    it('walks a nested list once under every repeat an enumeration claims, over the headings under it', () => {
      // ARRANGE
      const releases: HeadingEntry = {
        purpose: 'enumeration',
        level: 2,
        minCount: 1,
        headings: [{ purpose: 'heading', level: 3 }],
      };
      const outline = [h(1, 'Log'), h(2, 'Two'), h(3, 'Added'), h(2, 'One'), h(3, 'Fixed')];
      const expected = [
        { prefix: [], under: undefined, stretch: ['Log', 'Two', 'Added', 'One', 'Fixed'] },
        { prefix: [1], under: 'Two', stretch: ['Added'] },
        { prefix: [1], under: 'One', stretch: ['Fixed'] },
      ];
      // ACT
      const actual = shapeOf([{ purpose: 'heading', level: 1 }, releases], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('ends the headings under a heading at the next one at its level or shallower', () => {
      // ARRANGE
      const outline = [h(2, 'A'), h(4, 'deep'), h(3, 'mid'), h(1, 'top'), h(2, 'B')];
      const expected = [3, 2, 5];
      // ACT
      const actual = [endOfHeadingsUnder(outline, 0), endOfHeadingsUnder(outline, 1), endOfHeadingsUnder(outline, 3)];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('walks no nested list under a parent entry that claimed nothing', () => {
      // ARRANGE
      const parent: HeadingEntry = { purpose: 'heading', level: 1, headings: [{ purpose: 'heading', level: 2 }] };
      const expected = [{ prefix: [], under: undefined, stretch: ['Orphan'] }];
      // ACT
      const actual = shapeOf([parent], [h(2, 'Orphan')]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('walks lists depth-first, a nested list before the next parent heading, with the index path growing per list', () => {
      // ARRANGE
      const inner: HeadingEntry = { purpose: 'heading', level: 3, headings: [{ purpose: 'heading', level: 4 }] };
      const parts: HeadingEntry = { purpose: 'enumeration', level: 2, minCount: 1, headings: [inner] };
      const outline = [h(2, 'P1'), h(3, 'S1'), h(4, 'D1'), h(2, 'P2'), h(3, 'S2')];
      const expected = [
        { prefix: [], under: undefined, stretch: ['P1', 'S1', 'D1', 'P2', 'S2'] },
        { prefix: [0], under: 'P1', stretch: ['S1', 'D1'] },
        { prefix: [0, 0], under: 'S1', stretch: ['D1'] },
        { prefix: [0], under: 'P2', stretch: ['S2'] },
        { prefix: [0, 0], under: 'S2', stretch: [] },
      ];
      // ACT
      const actual = shapeOf([parts], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
