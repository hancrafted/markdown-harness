// Colocated unit test for what the walker admits, name by name.
//
// The refusals carry the whole safety story, so they are asserted rather than
// assumed: `node_modules/x.md` really does match `**\/*.md` under the platform
// matcher, which is why no rule downstream would have removed it.

import { describe, expect, it } from 'vitest';
import { actionFor, isMarkdownFile, walksInto } from './corpus-entry.pure';

describe('corpus entry admission', () => {
  describe('success cases', () => {
    it('descends into an ordinary directory', () => {
      // ARRANGE
      const admitted = true;
      // ACT
      const actual = walksInto('docs');
      // ASSERT
      expect(actual).toBe(admitted);
    });

    it('admits a markdown file', () => {
      // ARRANGE
      const admitted = true;
      // ACT
      const actual = isMarkdownFile('notes.md');
      // ASSERT
      expect(actual).toBe(admitted);
    });

    it('admits a directory whose name merely looks like a markdown file', () => {
      // ARRANGE
      const admitted = true;
      // ACT
      const actual = walksInto('notes.md');
      // ASSERT
      expect(actual).toBe(admitted);
    });

    it('collects a markdown file', () => {
      // ARRANGE
      const collected = 'collect';
      // ACT
      const actual = actionFor('file', 'notes.md');
      // ASSERT
      expect(actual).toBe(collected);
    });

    it('descends into an ordinary directory', () => {
      // ARRANGE
      const descended = 'descend';
      // ACT
      const actual = actionFor('directory', 'docs');
      // ASSERT
      expect(actual).toBe(descended);
    });

    it('collects a symlink that resolves to a markdown file', () => {
      // A repository that symlinks a document -- this one symlinks CLAUDE.md to
      // AGENTS.md -- would otherwise have it silently ungoverned.
      // ARRANGE
      const collected = 'collect';
      // ACT
      const actual = actionFor('file', 'CLAUDE.md');
      // ASSERT
      expect(actual).toBe(collected);
    });
  });

  describe('failure cases', () => {
    it('refuses node_modules, which is the refusal no glob would have made', () => {
      // ARRANGE
      const refused = false;
      // ACT
      const actual = walksInto('node_modules');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('refuses .git', () => {
      // ARRANGE
      const refused = false;
      // ACT
      const actual = walksInto('.git');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('refuses a file that is not markdown', () => {
      // ARRANGE
      const refused = false;
      // ACT
      const actual = isMarkdownFile('notes.txt');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('never descends into a symlinked directory', () => {
      // Following one could leave the tree entirely, or revisit it.
      // ARRANGE
      const ignored = 'ignore';
      // ACT
      const actual = actionFor('linked-directory', 'docs');
      // ASSERT
      expect(actual).toBe(ignored);
    });

    it('ignores an entry that is neither a file nor a directory', () => {
      // ARRANGE
      const ignored = 'ignore';
      // ACT
      const actual = actionFor('other', 'a-socket');
      // ASSERT
      expect(actual).toBe(ignored);
    });
  });

  describe('edge cases', () => {
    it('refuses every dot-directory, not only the two the spec names', () => {
      // ARRANGE
      const refused = false;
      // ACT
      const actual = walksInto('.claude');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('refuses a dotfile ending in .md, the way `*` refuses a leading dot', () => {
      // ARRANGE
      const refused = false;
      // ACT
      const actual = isMarkdownFile('.hidden.md');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('refuses a file named exactly .md', () => {
      // ARRANGE
      const refused = false;
      // ACT
      const actual = isMarkdownFile('.md');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('refuses an uppercase extension, where the platform matcher would admit it', () => {
      // The platform matcher turns case-insensitive for any segment holding a
      // wildcard, so `*.md` matches this while the literal `index.md` does not
      // match `INDEX.MD`. The corpus keeps one answer instead of that one.
      // ARRANGE
      const refused = false;
      // ACT
      const actual = isMarkdownFile('README.MD');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('refuses a name that only contains .md in the middle', () => {
      // ARRANGE
      const refused = false;
      // ACT
      const actual = isMarkdownFile('notes.md.txt');
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('ignores node_modules as a directory action, not merely as a name', () => {
      // ARRANGE
      const ignored = 'ignore';
      // ACT
      const actual = actionFor('directory', 'node_modules');
      // ASSERT
      expect(actual).toBe(ignored);
    });
  });
});
