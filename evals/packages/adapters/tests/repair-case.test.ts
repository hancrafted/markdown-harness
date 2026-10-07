// The repair case's seed, checked over the committed tree. Every case of kind repair seeds a file whose bytes are
// the thing under test, so: a directory-scoped ignore keeps the formatter off the seed, no folder the repository's
// own config governs holds it, its stale_after is in the far past, and the assess hook, run on it with no pinned
// instant, answers REVIEW. Each is shown red against a seed built to escape it.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { directoryIgnored, foldersOf, governedByFolders, isFarPast } from '../../arms/derive-arms.ts';

const EVALS = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROOT = join(EVALS, '..');
const CASES = join(EVALS, 'suites/steering/cases');
const FLOOR = '2015-01-01T00:00:00Z';
const MH = join(ROOT, 'dist/packages/cli/cli.js');

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

    it('is answered REVIEW by the built mh assess with no pinned instant, run in the seed itself', () => {
      // ARRANGE
      const [entry] = repairCases();
      const cwd = join(ROOT, entry?.vars.seedDir ?? '');
      const expected = 'REVIEW';
      // ACT
      const run = spawnSync(process.execPath, [MH, 'assess', entry?.vars.targetPath ?? ''], { cwd, encoding: 'utf8' });
      const actions = (JSON.parse(run.stdout) as { result: { modules: { agentAction: string }[] } }).result.modules.map(
        (module) => module.agentAction,
      );
      // ASSERT
      expect(actions).toContain(expected);
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
    it('keeps the seed config clear of the placeholder-free check: it carries the stale sentence as a carrier', () => {
      // ARRANGE
      const [entry] = repairCases();
      const config = readFileSync(join(ROOT, entry?.vars.seedDir ?? '', 'markdown-harness.config.yaml'), 'utf8');
      const expected = true;
      // ACT
      const actual = /assess:\s+stale:/.test(config);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
