// Colocated unit test for the shape and the order of paths inside the tree.
//
// Both properties exist so that a stored response compares equal on another
// machine, so the cases that matter are the ones a host could otherwise decide:
// the separator, and the collation.

import { describe, expect, it } from 'vitest';
import { childPath, inTreeOrder } from './tree-path.pure';

describe('tree paths', () => {
  describe('success cases', () => {
    it('joins a parent to a child with a forward slash', () => {
      // ARRANGE
      const expected = 'docs/research/notes.md';
      // ACT
      const actual = childPath('docs/research', 'notes.md');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('sorts paths lexicographically', () => {
      // ARRANGE
      const planted = ['docs/b.md', 'docs/a.md', 'README.md'];
      const expected = ['README.md', 'docs/a.md', 'docs/b.md'];
      // ACT
      const actual = inTreeOrder(planted);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('never emits a leading slash for a root-level entry', () => {
      // An empty parent is the root, and a `/` here would put a leading slash
      // on every path the report carries.
      // ARRANGE
      const expected = 'README.md';
      // ACT
      const actual = childPath('', 'README.md');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('does not order by host collation, which would sort case together', () => {
      // A locale collation puts `a.md` before `B.md`; code units do not. This is
      // the assertion that fails if `localeCompare` is ever reached for.
      // ARRANGE
      const planted = ['a.md', 'B.md'];
      const byCodeUnit = ['B.md', 'a.md'];
      // ACT
      const actual = inTreeOrder(planted);
      // ASSERT
      expect(actual).toEqual(byCodeUnit);
    });
  });

  describe('edge cases', () => {
    it('leaves the array it was handed untouched', () => {
      // ARRANGE
      const planted = ['docs/b.md', 'docs/a.md'];
      const asWritten = ['docs/b.md', 'docs/a.md'];
      // ACT
      inTreeOrder(planted);
      // ASSERT
      expect(planted).toEqual(asWritten);
    });

    it('orders an empty tree without complaint', () => {
      // ARRANGE
      const nothing: readonly string[] = [];
      // ACT
      const actual = inTreeOrder(nothing);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('sorts a deep path after its own parent rather than beside it', () => {
      // ARRANGE
      const planted = ['docs/a/b.md', 'docs/a.md'];
      const expected = ['docs/a.md', 'docs/a/b.md'];
      // ACT
      const actual = inTreeOrder(planted);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
