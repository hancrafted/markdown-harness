// Unit test for selector overlap and containment algebra.

import { describe, expect, it } from 'vitest';
import type { Selector } from '../../../config-contract/index.ts';
import { selectorContains, selectorsOverlap } from './selector-overlap.pure.ts';

describe('selectorsOverlap', () => {
  describe('success cases', () => {
    it('detects overlap when both selectors specify intersecting folderTrees', () => {
      // ARRANGE
      const a: Selector = { folderTrees: ['docs/'] };
      const b: Selector = { folderTrees: ['docs/vision/'] };
      // ACT
      const overlaps = selectorsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(true);
    });

    it('detects overlap when folderTrees intersects folders', () => {
      // ARRANGE
      const a: Selector = { folderTrees: ['docs/'] };
      const b: Selector = { folders: ['docs/sub/'] };
      // ACT
      const overlaps = selectorsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(true);
    });

    it('detects overlap when absent axis means every', () => {
      // ARRANGE
      const a: Selector = { fileNames: ['index.md'] };
      const b: Selector = { folderTrees: ['docs/'] };
      // ACT
      const overlaps = selectorsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(true);
    });

    it('detects containment when outer folderTree contains inner folders', () => {
      // ARRANGE
      const outer: Selector = { folderTrees: ['docs/'] };
      const inner: Selector = { folders: ['docs/vision/'], fileNames: ['VISION.md'] };
      // ACT
      const contained = selectorContains(outer, inner);
      // ASSERT
      expect(contained).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('does not overlap when folders are disjoint single folders', () => {
      // ARRANGE
      const a: Selector = { folders: ['docs/'] };
      const b: Selector = { folders: ['docs/sub/'] };
      // ACT
      const overlaps = selectorsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(false);
    });

    it('does not overlap when single folder is parent of inner folderTree', () => {
      // ARRANGE
      const a: Selector = { folders: ['docs/'] };
      const b: Selector = { folderTrees: ['docs/sub/'] };
      // ACT
      const overlaps = selectorsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(false);
    });

    it('does not overlap when name axes are disjoint', () => {
      // ARRANGE
      const a: Selector = { fileNames: ['a.md'] };
      const b: Selector = { fileNames: ['b.md'] };
      // ACT
      const overlaps = selectorsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('is segment-safe: does not treat docs/visionary/ as child of docs/vision/', () => {
      // ARRANGE
      const a: Selector = { folderTrees: ['docs/vision/'] };
      const b: Selector = { folderTrees: ['docs/visionary/'] };
      // ACT
      const overlaps = selectorsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(false);
    });

    it('rejects containment when outer specifies fileNames that do not cover inner', () => {
      // ARRANGE
      const outer: Selector = { folderTrees: ['docs/'], fileNames: ['a.md'] };
      const inner: Selector = { folderTrees: ['docs/'], fileNames: ['b.md'] };
      // ACT
      const contained = selectorContains(outer, inner);
      // ASSERT
      expect(contained).toBe(false);
    });

    it('rejects containment when outer has folder restriction but inner admits every folder', () => {
      // ARRANGE
      const outer: Selector = { folderTrees: ['docs/'] };
      const inner: Selector = { fileNames: ['a.md'] };
      // ACT
      const contained = selectorContains(outer, inner);
      // ASSERT
      expect(contained).toBe(false);
    });
  });
});
