// Colocated unit test for pairing corpus paths with the rules that won them.
//
// This runs BEFORE any file is opened, which is what lets `--check` read only
// the files it is going to report on. An invisible file is absent from the
// result for the stronger reason that nothing ever read it.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { governedFiles } from './corpus-governance.pure';

/** A hand-written stand-in covering exact paths and the one `**` shape in use. */
function matches(glob: string, path: string): boolean {
  if (glob.endsWith('/**/*.md')) return path.startsWith(`${glob.slice(0, -8)}/`) && path.endsWith('.md');
  if (!glob.startsWith('**/')) return glob === path;
  const tail = glob.slice(3);
  return path === tail || path.endsWith(`/${tail}`);
}

const INDEX: FrontmatterRule = {
  ruleId: 'index-files',
  intent: 'An index carries no frontmatter',
  fileName: 'index.md',
};
const PLAIN: FrontmatterRule = { ruleId: 'plain', intent: 'Say what you are', path: ['docs/plain/**/*.md'] };

describe('corpus governance', () => {
  describe('success cases', () => {
    it('pairs each path with the rule that won it', () => {
      // ARRANGE
      const files = ['docs/plain/notes.md'];
      const expected = ['plain'];
      // ACT
      const actual = governedFiles(files, [INDEX, PLAIN], matches).map((file) => file.rule.ruleId);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the walker order it was given', () => {
      // `files` is reported in walker order, so the pairing must not sort.
      // ARRANGE
      const files = ['docs/plain/zebra.md', 'docs/plain/apple.md'];
      const expected = ['docs/plain/zebra.md', 'docs/plain/apple.md'];
      // ACT
      const actual = governedFiles(files, [PLAIN], matches).map((file) => file.path);
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
      const actual = governedFiles(files, [PLAIN], matches).map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('governs nothing when the rule list is empty', () => {
      // ARRANGE
      const files = ['docs/plain/notes.md'];
      const empty: readonly unknown[] = [];
      // ACT
      const actual = governedFiles(files, [], matches);
      // ASSERT
      expect(actual).toEqual(empty);
    });
  });

  describe('edge cases', () => {
    it('gives a file to the first rule that selects it, not the most specific', () => {
      // Written order IS the precedence, and `index.md` sits above the directory
      // rule that also selects this path.
      // ARRANGE
      const files = ['docs/plain/index.md'];
      const expected = ['index-files'];
      // ACT
      const actual = governedFiles(files, [INDEX, PLAIN], matches).map((file) => file.rule.ruleId);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('governs nothing for an empty corpus', () => {
      // ARRANGE
      const empty: readonly unknown[] = [];
      // ACT
      const actual = governedFiles([], [PLAIN], matches);
      // ASSERT
      expect(actual).toEqual(empty);
    });
  });
});
