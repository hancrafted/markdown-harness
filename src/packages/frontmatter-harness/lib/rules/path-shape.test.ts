// Colocated unit test for query-path normalisation.

import { describe, expect, it } from 'vitest';
import { normalisePath } from './path-shape.pure';

describe('normalisePath', () => {
  describe('success cases', () => {
    it('leaves an already-normalised path alone', () => {
      // ARRANGE
      const path = 'docs/reference/api-limits.md';
      // ACT
      const actual = normalisePath(path);
      // ASSERT
      expect(actual).toBe(path);
    });

    it('strips a leading dot-slash', () => {
      // ARRANGE
      const path = './docs/a.md';
      const expected = 'docs/a.md';
      // ACT
      const actual = normalisePath(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('strips a leading slash', () => {
      // ARRANGE
      const path = '/docs/a.md';
      const expected = 'docs/a.md';
      // ACT
      const actual = normalisePath(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('does not strip a dot-slash from the middle of a path', () => {
      // Only the leading segment is decoration; an interior `./` is a real
      // directory traversal the caller wrote, and rewriting it would answer
      // about a path nobody asked about.
      // ARRANGE
      const path = 'docs/./a.md';
      // ACT
      const actual = normalisePath(path);
      // ASSERT
      expect(actual).toBe(path);
    });

    it('does not invent a path from an empty string', () => {
      // ARRANGE
      const path = '';
      // ACT
      const actual = normalisePath(path);
      // ASSERT
      expect(actual).toBe(path);
    });
  });

  describe('edge cases', () => {
    it('converts backslashes so a Windows-shaped path keys the same', () => {
      // ARRANGE
      const path = 'docs\\reference\\api-limits.md';
      const expected = 'docs/reference/api-limits.md';
      // ACT
      const actual = normalisePath(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('strips repeated leading decoration down to the bare path', () => {
      // ARRANGE
      const path = './././docs/a.md';
      const expected = 'docs/a.md';
      // ACT
      const actual = normalisePath(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
