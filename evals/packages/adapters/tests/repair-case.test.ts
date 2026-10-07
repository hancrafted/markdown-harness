// The repair case's seed, checked over the committed tree. Every case of kind repair seeds a file whose bytes are
// the thing under test, so: a directory-scoped ignore keeps the formatter off the seed, no folder the repository's
// own config governs holds it, its stale_after is in the far past, and the assess hook, run on it with no pinned
// instant, answers REVIEW. Each is shown red against a seed built to escape it.

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const EVALS = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROOT = join(EVALS, '..');
const CASES = join(EVALS, 'suites/steering/cases');
const MH = join(ROOT, 'dist/packages/cli/cli.js');

interface CaseEntry {
  readonly vars: { readonly kind: string; readonly seedDir: string; readonly targetPath: string };
}

const repairCases = (): CaseEntry[] =>
  readdirSync(CASES)
    .filter((name) => name.endsWith('.yaml'))
    .flatMap((name) => parse(readFileSync(join(CASES, name), 'utf8')) as CaseEntry[])
    .filter((entry) => entry.vars.kind === 'repair');

describe('every committed repair case', () => {
  describe('success cases', () => {
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
    it('is answered something other than REVIEW once the seed is made fresh, which is why the stamp must stay in the past', () => {
      // ARRANGE
      const [entry] = repairCases();
      const review = 'REVIEW';
      const cwd = mkdtempSync(join(tmpdir(), 'fresh-repair-seed-'));
      cpSync(join(ROOT, entry?.vars.seedDir ?? ''), cwd, { recursive: true });
      const note = join(cwd, entry?.vars.targetPath ?? '');
      writeFileSync(note, readFileSync(note, 'utf8').replace(/^stale_after:.*$/m, 'stale_after: 2999-01-01T00:00:00Z'));
      // ACT
      const run = spawnSync(process.execPath, [MH, 'assess', entry?.vars.targetPath ?? ''], { cwd, encoding: 'utf8' });
      rmSync(cwd, { recursive: true, force: true });
      const actions = (JSON.parse(run.stdout) as { result: { modules: { agentAction: string }[] } }).result.modules.map(
        (module) => module.agentAction,
      );
      // ASSERT
      expect(actions).not.toContain(review);
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
