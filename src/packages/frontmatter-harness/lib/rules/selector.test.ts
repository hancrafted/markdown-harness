// Colocated unit test for rule selection: the `fileName` sugar, and exclusion.
//
// The glob matcher arrives as an argument, so this test hands in one it writes
// itself. That keeps the file free of the platform matcher and makes the two
// questions separable: whether a rule offers the right globs, and whether the
// matcher agrees about them.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { globsForRule, ruleSelects } from './selector.pure';

/** A hand-written stand-in covering exact globs and the one `**` shape the sugar emits. */
function matches(glob: string, path: string): boolean {
  if (!glob.startsWith('**/')) return glob === path;
  const tail = glob.slice(3);
  return path === tail || path.endsWith(`/${tail}`);
}

const pathRule: FrontmatterRule = {
  ruleId: 'research',
  intent: 'Research notes cite what they drew on',
  path: ['docs/research/**/*.md'],
};

const fileNameRule: FrontmatterRule = {
  ruleId: 'log-files',
  intent: 'A log says when it was written',
  fileName: 'log.md',
};

describe('rule selection', () => {
  describe('success cases', () => {
    it('selects a path the rule lists', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/a.md'] };
      const selected = true;
      // ACT
      const actual = ruleSelects(rule, 'docs/a.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('desugars fileName into a repo-wide glob', () => {
      // ARRANGE
      const expected = ['**/log.md'];
      // ACT
      const actual = globsForRule(fileNameRule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('passes a path rule through verbatim', () => {
      // ARRANGE
      const expected = ['docs/research/**/*.md'];
      // ACT
      const actual = globsForRule(pathRule);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('declines a path no glob matches', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/a.md'] };
      const selected = false;
      // ACT
      const actual = ruleSelects(rule, 'docs/b.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('lets exclusion beat a glob that would otherwise match', () => {
      // Exclusion answers one yes/no question before any rule is chosen, so it
      // wins within the rule rather than competing with it.
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'r',
        intent: 'i',
        path: ['**/a.md'],
        excludeFiles: ['docs/a.md'],
      };
      const selected = false;
      // ACT
      const actual = ruleSelects(rule, 'docs/a.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });
  });

  describe('edge cases', () => {
    it('matches a fileName rule against a file at the repo root', () => {
      // The sugar is `**/log.md`, and a bare `log.md` has no directory to match
      // the `**` against — the case that decides whether the sugar is usable.
      // ARRANGE
      const selected = true;
      // ACT
      const actual = ruleSelects(fileNameRule, 'log.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('matches a fileName rule against a deeply nested file', () => {
      // ARRANGE
      const selected = true;
      // ACT
      const actual = ruleSelects(fileNameRule, 'a/b/c/log.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('selects nothing for a rule whose path list is empty', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: [] };
      const selected = false;
      // ACT
      const actual = ruleSelects(rule, 'docs/a.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });
  });
});
