// Integration suite for the `mh` entry point, at the process boundary.
//
// Exit codes and the stdout/stderr split are contract, and neither is
// observable from inside the process. The entry file is resolved from
// `package.json`'s `bin.mh` rather than hard-coded, so a declaration that goes
// missing fails this suite instead of being quietly worked around.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CONFIG = 'fixtures/conformance/valid-test-config.yaml';
const USAGE_LEAD = 'usage: mh';
const REJECTED = 'CONFIG_REJECTED';
const GOVERNED = 'governed';
const INVISIBLE = 'invisible';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { bin?: { mh?: string } };
const declared = manifest.bin?.mh;
if (declared === undefined) throw new Error('package.json must declare bin.mh for this suite to run');
const entry = declared;

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
