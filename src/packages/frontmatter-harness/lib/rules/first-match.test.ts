// Colocated unit test for first-match resolution.
//
// Ordering is the whole subject here, so every case is built from rules that
// deliberately overlap. The matcher is hand-written, as it is for the selector.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { findFirstMatch } from './first-match.pure';

/** A hand-written stand-in covering exact globs and a `<dir>/**` prefix. */
function matches(glob: string, path: string): boolean {
  if (glob.endsWith('/**')) return path.startsWith(glob.slice(0, -2));
  return glob === path;
}

const specific: FrontmatterRule = {
  ruleId: 'specific',
  intent: 'The narrow rule, written first',
  path: ['docs/research/notes.md'],
};

const broad: FrontmatterRule = {
  ruleId: 'broad',
  intent: 'The catch-all, written last',
  path: ['docs/**'],
};

describe('findFirstMatch', () => {
  describe('success cases', () => {
    it('returns the earlier rule when two both match', () => {
      // ARRANGE
      const rules = [specific, broad];
      const expected = 'specific';
      // ACT
      const actual = findFirstMatch('docs/research/notes.md', rules, matches);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });

    it('returns the only rule that matches', () => {
      // ARRANGE
      const rules = [specific, broad];
      const expected = 'broad';
      // ACT
      const actual = findFirstMatch('docs/other.md', rules, matches);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('returns nothing when no rule matches', () => {
      // ARRANGE
      const rules = [specific, broad];
      // ACT
      const actual = findFirstMatch('README.md', rules, matches);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('returns nothing for an empty rule list', () => {
      // ARRANGE
      const rules: FrontmatterRule[] = [];
      // ACT
      const actual = findFirstMatch('docs/a.md', rules, matches);
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
        intent: 'Everything under docs, except the one exempt file',
        path: ['docs/**'],
        excludeFiles: ['docs/exempt.md'],
      };
      const fallback: FrontmatterRule = { ruleId: 'fallback', intent: 'The rest', path: ['docs/exempt.md'] };
      const expected = 'fallback';
      // ACT
      const actual = findFirstMatch('docs/exempt.md', [narrow, fallback], matches);
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
      const actual = findFirstMatch('docs/research/notes.md', rules, matches);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });
  });
});
