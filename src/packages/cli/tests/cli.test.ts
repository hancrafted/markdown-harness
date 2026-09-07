// Integration suite for the `mh` entry point, at the process boundary.
//
// Exit codes and the stdout/stderr split are contract, and neither is
// observable from inside the process. The entry file is resolved from
// `package.json`'s `bin.mh` rather than hard-coded, so a declaration that goes
// missing fails this suite instead of being quietly worked around.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CONFIG = 'fixtures/conformance/valid-test-config.yaml';
const CORPUS_ROOT = 'fixtures/conformance';
const USAGE_LEAD = 'usage: mh';
const REJECTED = 'CONFIG_REJECTED';
const GOVERNED = 'governed';
const INVISIBLE = 'invisible';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { bin?: { mh?: string } };
const declared = manifest.bin?.mh;
if (declared === undefined) throw new Error('package.json must declare bin.mh for this suite to run');
const entry = declared;

/**
 * A corpus planted in a tmpdir, with a config that governs every markdown file
 * the walker enumerates.
 *
 * The refusals are only observable under a config broad enough to select what
 * the walker should never have handed over: a file no rule selects is invisible
 * either way, so a narrower config reads the same whether the walker refused
 * `node_modules/` or not. The kit ships such a config, but planting a
 * `node_modules/` fixture under `docs/evals/ablation/kit/` would change
 * `kit.sha256` and make every future mint refuse to run.
 */
let planted = '';
let plantedConfig = '';

beforeAll(() => {
  planted = mkdtempSync(join(tmpdir(), 'mh-cli-audit-'));

  mkdirSync(join(planted, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(join(planted, '.git'), { recursive: true });

  writeFileSync(join(planted, 'kept.md'), '');
  writeFileSync(join(planted, 'node_modules', 'pkg', 'refused.md'), '');
  writeFileSync(join(planted, '.git', 'refused.md'), '');

  plantedConfig = join(planted, 'walker.config.yaml');
  writeFileSync(
    plantedConfig,
    [
      'frontmatter:',
      '  rules:',
      '    - ruleId: every-markdown-file',
      "      path: ['**/*.md']",
      '      intent: Governs every markdown file the walker enumerates',
      '      fields:',
      '        type:',
      '          presence: required',
      '',
    ].join('\n'),
  );
});

afterAll(() => {
  rmSync(planted, { recursive: true, force: true });
});

/** Run the built entry file the way a caller would, and report all three channels. */
function mh(...args: readonly string[]): { stdout: string; stderr: string; code: number | null } {
  const run = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' });
  return { stdout: run.stdout, stderr: run.stderr, code: run.status };
}

describe('mh', () => {
  describe('success cases', () => {
    it('answers a governed query on stdout and exits 0', () => {
      // ARRANGE
      const success = 0;
      const empty = '';
      // ACT
      const run = mh('--query', 'docs/reference/api-limits.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.governance).toBe(GOVERNED);
    });

    it('answers an audit on stdout and exits 0', () => {
      // ARRANGE
      const success = 0;
      const empty = '';
      const auditing = 'audit';
      // ACT
      const run = mh('--audit', '--root', CORPUS_ROOT, '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).command).toBe(auditing);
    });

    it('gives every rule a row, including the ones that governed nothing', () => {
      // A rule that wins no file reports nothing anywhere else, so its row is
      // the only place an ordering mistake or a glob typo becomes visible.
      //
      // The count tracks `fixtures/conformance/valid-test-config.yaml`. ARCH-002
      // makes growing that config a reviewed act, so stating the number here
      // rather than counting it back off the file keeps this test part of that
      // review instead of silently agreeing with whatever the config now says.
      // ARRANGE
      const declaredRules = 9;
      const rowShape = ['rule', 'won', 'shadowed', 'shadowedBy', 'excluded'];
      // ACT
      const run = mh('--audit', '--root', CORPUS_ROOT, '--config', CONFIG);
      const rows = JSON.parse(run.stdout).result.rules;
      // ASSERT
      expect(rows).toHaveLength(declaredRules);
      expect(Object.keys(rows[0])).toEqual(rowShape);
    });

    it('answers an ungoverned path as invisible and still exits 0', () => {
      // ARRANGE
      const success = 0;
      // ACT
      const run = mh('--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(JSON.parse(run.stdout).result.governance).toBe(INVISIBLE);
    });
  });

  describe('failure cases', () => {
    it('puts usage on stderr, nothing on stdout, and exits 2', () => {
      // The two flavours of exit 2 are told apart by channel, never by number.
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--verbose');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
    });

    it('puts a rejected config on stdout, nothing on stderr, and exits 2', () => {
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--query', 'docs/a.md', '--config', 'no-such-config.yaml');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.error).toBe(REJECTED);
    });

    it('refuses a root that does not exist rather than auditing an empty corpus', () => {
      // The acceptance criterion this exists for: a mistyped root is a usage
      // error, never a report over nothing.
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--audit', '--root', 'no-such-directory', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
    });

    it('rejects a config on stdout even though the command was --audit', () => {
      // "Never exits 1" is a statement about the corpus, not a promise of 0.
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--audit', '--root', CORPUS_ROOT, '--config', 'no-such-config.yaml');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.error).toBe(REJECTED);
    });

    it('refuses a root combined with a query', () => {
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--root', 'docs', '--query', 'docs/a.md');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
    });
  });

  describe('edge cases', () => {
    it('writes JSON with two-space indentation and a trailing newline', () => {
      // ARRANGE
      const indented = '\n  "command"';
      const trailing = '}\n';
      // ACT
      const run = mh('--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.stdout).toContain(indented);
      expect(run.stdout.slice(-trailing.length)).toBe(trailing);
    });

    it('echoes path and config exactly as written, never resolved', () => {
      // ARRANGE
      const written = './docs/reference/api-limits.md';
      // ACT
      const run = mh('--query', written, '--config', CONFIG);
      // ASSERT
      expect(JSON.parse(run.stdout).path).toBe(written);
      expect(JSON.parse(run.stdout).config).toBe(CONFIG);
    });

    it('never lets a refused directory into the corpus it audits', () => {
      // Measured, not assumed: `node_modules/x.md` DOES match `**/*.md` under
      // the platform matcher, so this count is the only thing standing between
      // an adopter and every dependency they ever installed.
      // ARRANGE
      const onlyKeptMd = 1;
      // ACT
      const run = mh('--audit', '--root', planted, '--config', plantedConfig);
      const rows = JSON.parse(run.stdout).result.rules;
      // ASSERT
      expect(rows[0].won).toBe(onlyKeptMd);
    });

    it('echoes an audit root and config exactly as written, never resolved', () => {
      // ARRANGE
      const written = './fixtures/conformance';
      // ACT
      const run = mh('--audit', '--root', written, '--config', CONFIG);
      // ASSERT
      expect(JSON.parse(run.stdout).root).toBe(written);
      expect(JSON.parse(run.stdout).config).toBe(CONFIG);
    });

    it('emits nothing at all on stdout when argv is refused', () => {
      // ARRANGE
      const empty = '';
      // ACT
      const run = mh('--check', '--audit');
      // ASSERT
      expect(run.stdout).toBe(empty);
    });
  });
});
