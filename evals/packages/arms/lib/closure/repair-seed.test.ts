// Colocated unit test for the repair seed's scope guards. A repair seed holds a file whose bytes are the thing
// under test: a stamp in the far past that must stay past at any real clock. Three guards keep it from being
// repaired by a formatter, governed by the repository's own `mh check`, or quietly made fresh.

import { describe, expect, it } from 'vitest';
import { directoryIgnored, foldersOf, governedByFolders, isFarPast } from './repair-seed.pure.ts';

const SEED = 'evals/suites/steering/seed/stale-note';
const IGNORE = ['# a comment', 'node_modules', '', `${SEED}/**`, 'docs/workshop/**/raw.md'].join('\n');

describe('directoryIgnored', () => {
  describe('success cases', () => {
    it('reads a directory entry ending in a double star as covering everything below it', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = directoryIgnored(`${SEED}/docs/research/feature-flags.md`, IGNORE);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reads a directory entry ending in a slash the same way', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = directoryIgnored(`${SEED}/a.md`, `${SEED}/`);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a seed that escapes the ignored directory, the sibling that merely shares its prefix included', () => {
      // ARRANGE
      const expected = [false, false];
      // ACT
      const actual = [
        directoryIgnored('evals/suites/steering/seed/other/a.md', IGNORE),
        directoryIgnored(`${SEED}-copy/a.md`, IGNORE),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not count a wildcard entry as directory-scoped, nor a comment line', () => {
      // ARRANGE
      const ignore = [`# ${SEED}/**`, 'evals/**/*.md'].join('\n');
      // ACT
      const actual = directoryIgnored(`${SEED}/a.md`, ignore);
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});

describe('governedByFolders', () => {
  describe('success cases', () => {
    it('finds a path under a folder a rule governs', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = governedByFolders('docs/research/a.md', ['docs/', 'docs/research/']);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('does not find a seed outside every governed folder', () => {
      // ARRANGE
      const expected = false;
      // ACT
      const actual = governedByFolders(`${SEED}/docs/research/a.md`, ['docs/', 'docs/research/']);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('reads a folder token without its trailing slash, and not a sibling sharing its prefix', () => {
      // ARRANGE
      const expected = [true, false];
      // ACT
      const actual = [governedByFolders('docs/a.md', ['docs']), governedByFolders('docs-old/a.md', ['docs'])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('foldersOf', () => {
  describe('success cases', () => {
    it('collects every folders list at any depth of an evaluated config', () => {
      // ARRANGE
      const config = {
        frontmatter: { rules: [{ folders: ['docs/'] }] },
        'body-structure': { rules: [{ folders: ['docs/research/'], excludeFiles: [{ folders: ['docs/okf/'] }] }] },
      };
      const expected = ['docs/', 'docs/research/', 'docs/okf/'];
      // ACT
      const actual = foldersOf(config);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('skips a folders value that is not a list of strings, rather than reading it as a folder', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = [...foldersOf({ folders: 'docs/' }), ...foldersOf({ folders: ['docs/', 3] })];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('returns nothing for a document with no folders key, or for a scalar', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = [...foldersOf({ rules: [{ intent: 'x' }] }), ...foldersOf('docs/'), ...foldersOf(null)];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('isFarPast', () => {
  describe('success cases', () => {
    it('is true for a stamp before the floor', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = isFarPast('2001-01-01T00:00:00Z', '2015-01-01T00:00:00Z');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('is false for a seed made fresh: a stamp after the floor, and one that does not parse', () => {
      // ARRANGE
      const expected = [false, false];
      // ACT
      const actual = [
        isFarPast('2099-01-01T00:00:00Z', '2015-01-01T00:00:00Z'),
        isFarPast('soon', '2015-01-01T00:00:00Z'),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('is false at the floor itself, because a stamp is far past only strictly before it', () => {
      // ARRANGE
      const expected = false;
      // ACT
      const actual = isFarPast('2015-01-01T00:00:00Z', '2015-01-01T00:00:00Z');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
