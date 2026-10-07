// Colocated unit test for the repair seed's scope guards. A repair seed holds a file whose bytes are the thing
// under test: a stamp in the far past that must stay past at any real clock. Three guards keep it from being
// repaired by a formatter, governed by the repository's own `mh check`, or quietly made fresh.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
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

// The committed repair cases, checked with the guards above: the seeds are read from the tree, never from a list here.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const CASES = join(ROOT, 'evals/suites/steering/cases');
const FLOOR = '2015-01-01T00:00:00Z';

interface CaseEntry {
  readonly vars: { readonly kind: string; readonly seedDir: string; readonly targetPath: string };
}

const repairCases = (): CaseEntry[] =>
  readdirSync(CASES)
    .filter((name) => name.endsWith('.yaml'))
    .flatMap((name) => parse(readFileSync(join(CASES, name), 'utf8')) as CaseEntry[])
    .filter((entry) => entry.vars.kind === 'repair');

const seededNote = (entry: CaseEntry): string => `${entry.vars.seedDir}/${entry.vars.targetPath}`;
const ignoreText = (): string => readFileSync(join(ROOT, '.prettierignore'), 'utf8');
const ownFolders = (): string[] => foldersOf(parse(readFileSync(join(ROOT, 'markdown-harness.config.yaml'), 'utf8')));
const staleAfterOf = (path: string): string => /^stale_after:\s*(\S+)\s*$/m.exec(readFileSync(path, 'utf8'))?.[1] ?? '';

describe('every committed repair case', () => {
  describe('success cases', () => {
    it('has a seed under a directory-scoped formatter ignore, outside every folder the repository governs, over a non-empty set', () => {
      // ARRANGE
      const cases = repairCases();
      // ACT
      const escapes = cases.filter(
        (entry) =>
          !directoryIgnored(seededNote(entry), ignoreText()) || governedByFolders(seededNote(entry), ownFolders()),
      );
      // ASSERT
      expect(cases.length).toBeGreaterThanOrEqual(1);
      expect(escapes).toEqual([]);
    });

    it('seeds a stale_after in the far past, so the note is stale at any clock a run will read', () => {
      // ARRANGE
      const cases = repairCases();
      // ACT
      const fresh = cases.filter((entry) => !isFarPast(staleAfterOf(join(ROOT, seededNote(entry))), FLOOR));
      // ASSERT
      expect(fresh).toEqual([]);
    });

    it('seeds a stale_after in the far past, so the note is stale at any clock a run will read', () => {
      // ARRANGE
      const cases = repairCases();
      // ACT
      const fresh = cases.filter((entry) => !isFarPast(staleAfterOf(join(ROOT, seededNote(entry))), FLOOR));
      // ASSERT
      expect(fresh).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('goes red on a seed that escapes the ignored directory', () => {
      // ARRANGE
      const [entry] = repairCases();
      const escaped = `${entry?.vars.seedDir ?? ''}-copy/${entry?.vars.targetPath ?? ''}`;
      // ACT
      const actual = directoryIgnored(escaped, ignoreText());
      // ASSERT
      expect(actual).toBe(false);
    });

    it('goes red on a seed moved under a folder the repository governs', () => {
      // ARRANGE
      const moved = 'docs/research/stale-note.md';
      // ACT
      const actual = governedByFolders(moved, ownFolders());
      // ASSERT
      expect(actual).toBe(true);
    });

    it('goes red on a seed made fresh', () => {
      // ARRANGE
      const fresh = '2999-01-01T00:00:00Z';
      // ACT
      const actual = isFarPast(fresh, FLOOR);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('finds at least one repair case, so a loop over the set cannot pass over nothing', () => {
      // ARRANGE
      const expected = 1;
      // ACT
      const actual = repairCases().length;
      // ASSERT
      expect(actual).toBeGreaterThanOrEqual(expected);
    });
  });
});
