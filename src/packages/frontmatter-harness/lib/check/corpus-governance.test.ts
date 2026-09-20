// Colocated unit test for pairing corpus paths with the rules that won them.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../section.types.ts';
import { governedFiles } from './corpus-governance.pure.ts';

const INDEX: FrontmatterRule = {
  ruleId: 'index-files',
  intent: 'An index carries no frontmatter',
  fileNames: ['index.md'],
};
const PLAIN: FrontmatterRule = {
  ruleId: 'plain',
  intent: 'Say what you are',
  folderTrees: ['docs/plain/'],
};

describe('corpus governance', () => {
  describe('success cases', () => {
    it('pairs each path with the rule that won it', () => {
      // ARRANGE
      const files = ['docs/plain/notes.md'];
      const expected = ['plain'];
      // ACT
      const actual = governedFiles(files, [INDEX, PLAIN]).map((file) => file.rule.ruleId);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the walker order it was given', () => {
      // ARRANGE
      const files = ['docs/plain/zebra.md', 'docs/plain/apple.md'];
      const expected = ['docs/plain/zebra.md', 'docs/plain/apple.md'];
      // ACT
      const actual = governedFiles(files, [PLAIN]).map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('drops a path no rule selects', () => {
      // ARRANGE
      const files = ['README.md', 'docs/plain/notes.md'];
      const expected = ['docs/plain/notes.md'];
      // ACT
      const actual = governedFiles(files, [PLAIN]).map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('governs nothing when the rule list is empty', () => {
      // ARRANGE
      const files = ['docs/plain/notes.md'];
      const empty: readonly unknown[] = [];
      // ACT
      const actual = governedFiles(files, []);
      // ASSERT
      expect(actual).toEqual(empty);
    });
  });

  describe('edge cases', () => {
    it('gives a file to the first rule that selects it, not the most specific', () => {
      // ARRANGE
      const files = ['docs/plain/index.md'];
      const expected = ['index-files'];
      // ACT
      const actual = governedFiles(files, [INDEX, PLAIN]).map((file) => file.rule.ruleId);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('governs nothing for an empty corpus', () => {
      // ARRANGE
      const empty: readonly unknown[] = [];
      // ACT
      const actual = governedFiles([], [PLAIN]);
      // ASSERT
      expect(actual).toEqual(empty);
    });
  });
});
