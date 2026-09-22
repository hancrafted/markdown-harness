// Integration test for the public corpus-membership vocabulary.

import { describe, expect, it } from 'vitest';
import { isCorpusPath } from '../corpus-membership.ts';

describe('corpus membership', () => {
  describe('success cases', () => {
    it('admits a markdown path in a nested folder', () => {
      // ARRANGE
      const path = 'docs/vision/product.md';
      const admitted = true;
      // ACT
      const actual = isCorpusPath(path);
      // ASSERT
      expect(actual).toBe(admitted);
    });
  });

  describe('failure cases', () => {
    it('refuses a non-markdown path', () => {
      // ARRANGE
      const path = 'docs/vision/product.txt';
      const refused = false;
      // ACT
      const actual = isCorpusPath(path);
      // ASSERT
      expect(actual).toBe(refused);
    });
  });

  describe('edge cases', () => {
    it('refuses a dotfile at the corpus root', () => {
      // ARRANGE
      const path = '.draft.md';
      const refused = false;
      // ACT
      const actual = isCorpusPath(path);
      // ASSERT
      expect(actual).toBe(refused);
    });
  });
});
