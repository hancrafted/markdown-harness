// Unit test for recursive extent algebra.

import { describe, expect, it } from 'vitest';
import type { ClaimExtent } from '../../../config-contract/index.ts';
import { contains, extentsOverlap } from './extent-algebra.pure.ts';

describe('extent algebra', () => {
  describe('success cases', () => {
    it('detects overlap when inclusions overlap and exclusions do not eliminate the overlap', () => {
      // ARRANGE
      const a: ClaimExtent = { include: { folderTrees: ['docs/'] }, exclude: [] };
      const b: ClaimExtent = { include: { folderTrees: ['docs/research/'] }, exclude: [] };
      // ACT
      const overlaps = extentsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(true);
    });

    it('detects containment when outer covers inner and has no conflicting exclusion', () => {
      // ARRANGE
      const outer: ClaimExtent = { include: { folderTrees: ['docs/'] }, exclude: [] };
      const inner: ClaimExtent = { include: { folderTrees: ['docs/vision/'] }, exclude: [] };
      // ACT
      const isContained = contains(outer, inner);
      // ASSERT
      expect(isContained).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('reports no overlap when an exclusion completely covers the other extent', () => {
      // ARRANGE
      const a: ClaimExtent = {
        include: { folderTrees: ['docs/'] },
        exclude: [{ include: { folderTrees: ['docs/research/'] }, exclude: [] }],
      };
      const b: ClaimExtent = {
        include: { folderTrees: ['docs/research/'] },
        exclude: [],
      };
      // ACT
      const overlaps = extentsOverlap(a, b);
      // ASSERT
      expect(overlaps).toBe(false);
    });

    it('reports no containment when outer does not contain inner selector', () => {
      // ARRANGE
      const outer: ClaimExtent = { include: { folderTrees: ['docs/vision/'] }, exclude: [] };
      const inner: ClaimExtent = { include: { folderTrees: ['docs/'] }, exclude: [] };
      // ACT
      const isContained = contains(outer, inner);
      // ASSERT
      expect(isContained).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('supports recursive nested exclusions at depth three', () => {
      // ARRANGE
      const depth1: ClaimExtent = {
        include: { folderTrees: ['docs/'] },
        exclude: [
          {
            include: { folderTrees: ['docs/research/'] },
            exclude: [
              {
                include: { folderTrees: ['docs/research/notes/'] },
                exclude: [],
              },
            ],
          },
        ],
      };
      const query: ClaimExtent = {
        include: { folderTrees: ['docs/research/notes/'] },
        exclude: [],
      };
      // ACT
      const overlaps = extentsOverlap(depth1, query);
      // ASSERT
      expect(overlaps).toBe(true);
    });
  });
});
