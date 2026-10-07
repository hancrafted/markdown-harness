// `npm run conformance -- <path>`, asked at the process boundary a human uses:
// one passing spec folder, one passing rejected-config case directory, one
// deliberately mismatched scratch copy, and refused paths below a tier's
// runnable unit (#231).
//
// The script spawns the compiled `mh`, so build first (trap 9 in
// docs/agents/verification.md).

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { conformanceRoot } from '../case-corpus.ts';

const REPOSITORY = join(conformanceRoot(), '..', '..');
const SCRIPT = join(REPOSITORY, 'src', 'packages', 'conformance', 'run-spec-folder.ts');
const FOLDER = 'fixtures/conformance/body-structure/docs/maxCount__exactly-two';

function conformance(...args: string[]): { stdout: string; stderr: string; code: number | null } {
  const run = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPOSITORY, encoding: 'utf8' });
  return { stdout: run.stdout, stderr: run.stderr, code: run.status };
}

const scratch = mkdtempSync(join(tmpdir(), 'mh-conformance-script-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('npm run conformance', () => {
  describe('success cases', () => {
    it('prints the spec line, each case against its marker and the identical frozen check, and exits 0', () => {
      // ARRANGE
      const expected = {
        code: 0,
        lines: [
          'spec  body-structure/docs/maxCount__exactly-two',
          '  # Spec: An enumeration whose `minCount` and `maxCount` are equal asks for exactly that many repeats.',
          '  one.md    FAILS       ok',
          '  three.md  FAILS       ok',
          '  two.md    PASSES      ok',
          '  governed: 3 stated, 3 reported  ok',
          '  expected-check.json  identical',
          'agrees',
        ],
      };
      // ACT
      const run = conformance(FOLDER);
      const actual = { code: run.code, lines: run.stdout.trimEnd().split('\n') };
      // ASSERT
      expect(actual).toEqual(expected);
    });
    it('prints a rejected-config case, the fault its config opens with and its identical frozen files, and exits 0', () => {
      // ARRANGE
      const expected = {
        code: 0,
        lines: [
          'case  rejected-config/frontmatter__duplicate-rule-id',
          '  # Two rules sharing a `ruleId`.',
          '  expected-rejection.json  identical',
          'agrees',
        ],
      };
      // ACT
      const run = conformance('fixtures/conformance/rejected-config/frontmatter__duplicate-rule-id');
      const actual = { code: run.code, lines: run.stdout.trimEnd().split('\n') };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses an option it does not know with exit 2, rather than running every tier', () => {
      // ARRANGE
      const expected = {
        code: 2,
        stdout: '',
        stderr: 'conformance: unknown option --paths — usage: npm run conformance [-- --path <path> [<path> ...]]\n',
      };
      // ACT
      const run = conformance('--paths', FOLDER);
      const actual = { code: run.code, stdout: run.stdout, stderr: run.stderr };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the case and the frozen line that disagree in a mismatched scratch copy, and exits 1', () => {
      // two.md now claims to fail, and the config asks for three repeats, so
      // three.md passes where its marker says it fails and the frozen check moves.
      // ARRANGE
      const copy = join(scratch, 'mismatched');
      cpSync(join(REPOSITORY, FOLDER), copy, { recursive: true });
      const two = join(copy, 'two.md');
      writeFileSync(two, readFileSync(two, 'utf8').replace('expect: PASSES', 'expect: FAILS'));
      const config = join(copy, 'markdown-harness.config.yaml');
      writeFileSync(
        config,
        readFileSync(config, 'utf8').replace('minCount: 2, maxCount: 2', 'minCount: 3, maxCount: 3'),
      );
      const expected = {
        code: 1,
        stderr: '',
        stdout: expect.stringMatching(
          / {2}three\.md {2}FAILS {7}MISMATCH {2}\(not reported failing\)\n[\s\S]* {2}expected-check\.json {2}DIFFERS\n {4}-.*"minCount": 2,\n {4}-.*"maxCount": 2\n {4}\+.*"minCount": 3,[\s\S]*\nDISAGREES\n$/u,
        ),
      };
      // ACT
      const run = conformance(copy);
      // ASSERT
      expect(run).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('runs every path listed after --path, in order, and exits 0 when all agree', () => {
      // ARRANGE
      const rejectedCase = 'fixtures/conformance/rejected-config/frontmatter__duplicate-rule-id';
      const expected = {
        code: 0,
        headers: [
          'spec body-structure/docs/maxCount__exactly-two',
          'case rejected-config/frontmatter__duplicate-rule-id',
        ],
      };
      // ACT
      const run = conformance('--path', FOLDER, rejectedCase);
      const headers = run.stdout
        .split('\n')
        .filter((line) => /^(spec|case)\s/u.test(line))
        .map((line) => line.replace(/\s+/gu, ' '));
      const actual = { code: run.code, headers };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a file inside a rejected-config case with the reason, and exits 2', () => {
      // ARRANGE
      const expected = { code: 2, stdout: '', stderr: expect.stringContaining('is not a case directory') };
      // ACT
      const actual = conformance('rejected-config/file__config-not-found/expected-rejection.json');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a frontmatter subfolder with the reason, and exits 2', () => {
      // ARRANGE
      const expected = {
        code: 2,
        stdout: '',
        stderr: expect.stringContaining('the frontmatter tier is not split into spec folders'),
      };
      // ACT
      const actual = conformance('fixtures/conformance/frontmatter/docs/reference');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
