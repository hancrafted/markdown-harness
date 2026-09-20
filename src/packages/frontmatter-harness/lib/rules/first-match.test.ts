// Colocated unit test for first-match resolution.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../section.types.ts';
import { findFirstMatch } from './first-match.pure.ts';

const specific: FrontmatterRule = {
  ruleId: 'specific',
  intent: 'The narrow rule, written first',
  folders: ['docs/research/'],
  fileNames: ['notes.md'],
};

const broad: FrontmatterRule = {
  ruleId: 'broad',
  intent: 'The catch-all, written last',
  folderTrees: ['docs/'],
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
      // ARRANGE
      const narrow: FrontmatterRule = {
        ruleId: 'narrow',
        intent: 'Everything under docs, except the one exempt file',
        folderTrees: ['docs/'],
        excludeFiles: [{ fileNames: ['exempt.md'] }],
      };
      const fallback: FrontmatterRule = {
        ruleId: 'fallback',
        intent: 'The rest',
        fileNames: ['exempt.md'],
      };
      const expected = 'fallback';
      // ACT
      const actual = findFirstMatch('docs/exempt.md', [narrow, fallback]);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });

    it('obeys written order rather than specificity', () => {
      // ARRANGE
      const rules = [broad, specific];
      const expected = 'broad';
      // ACT
      const actual = findFirstMatch('docs/research/notes.md', rules);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });
  });
});
