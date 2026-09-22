// Colocated unit test for first-match resolution.
//
// Ordering is the whole subject here, so every case is built from rules that
// deliberately overlap. Two literal axes make overlap easy to write down: the
// narrow rule intersects a folder with a name, the broad one names the folder
// alone, and both reach the same file.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../section.ts';
import { findFirstMatch } from './first-match.pure';

const specific: FrontmatterRule = {
  ruleId: 'specific',
  intent: 'The narrow rule, written first',
  folders: ['docs/research/'],
  fileNames: ['notes.md'],
};

const broad: FrontmatterRule = {
  ruleId: 'broad',
  intent: 'The catch-all, written last',
  folders: ['docs/', 'docs/research/'],
};

describe('findFirstMatch', () => {
  describe('success cases', () => {
    it('returns the earlier rule when two both match', () => {
      // ARRANGE
      const rules = [specific, broad];
      const expected = 'specific';
      // ACT
      const actual = findFirstMatch('docs/research/notes.md', rules);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });

    it('returns the only rule that matches', () => {
      // ARRANGE
      const rules = [specific, broad];
      const expected = 'broad';
      // ACT
      const actual = findFirstMatch('docs/other.md', rules);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('returns nothing when no rule matches', () => {
      // ARRANGE
      const rules = [specific, broad];
      // ACT
      const actual = findFirstMatch('README.md', rules);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('returns nothing for an empty rule list', () => {
      // ARRANGE
      const rules: FrontmatterRule[] = [];
      // ACT
      const actual = findFirstMatch('docs/a.md', rules);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('lets an excluded path fall through to a later, broader rule', () => {
      // The documented use of `excludeFiles` under first-match: opt one file out
      // of a narrow rule without restating the broad rule's constraints.
      // ARRANGE
      const narrow: FrontmatterRule = {
        ruleId: 'narrow',
        intent: 'Everything in docs, except the one exempt file',
        folders: ['docs/'],
        excludeFiles: [{ folders: ['docs/'], fileNames: ['exempt.md'] }],
      };
      const fallback: FrontmatterRule = {
        ruleId: 'fallback',
        intent: 'The rest',
        folders: ['docs/'],
        fileNames: ['exempt.md'],
      };
      const expected = 'fallback';
      // ACT
      const actual = findFirstMatch('docs/exempt.md', [narrow, fallback]);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });

    it('obeys written order rather than specificity', () => {
      // Reversed, the narrow rule silently wins for zero files. Nothing sorts
      // the list, so a broad rule written first shadows every rule after it.
      // ARRANGE
      const rules = [broad, specific];
      const expected = 'broad';
      // ACT
      const actual = findFirstMatch('docs/research/notes.md', rules);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });

    it('does not let a folder token reach a file one level below it', () => {
      // A nested corpus, two files, one folder token: the parent's token takes
      // the file beside it and never the one below. No recursion anywhere.
      // ARRANGE
      const ruleId = 'parent-only';
      const parentOnly: FrontmatterRule = { ruleId, intent: 'i', folders: ['docs/'] };
      const beside = 'docs/a.md';
      const below = 'docs/sub/b.md';
      const reachedBesideOnly = [ruleId, undefined];
      // ACT
      const actual = [beside, below].map((path) => findFirstMatch(path, [parentOnly])?.ruleId);
      // ASSERT
      expect(actual).toEqual(reachedBesideOnly);
    });
  });
});
