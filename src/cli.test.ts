// Seam 5: the CLI, exit codes only.
//
// The seam is the PROCESS boundary — argv in, an exit code and a stream out —
// because that is a CLI's whole interface and the only place an exit code is
// observable. Testing an exported `main()` instead would leave the one thing
// this slice is about untested.
//
// Every assertion pairs the code with an empty stderr. A missing or throwing
// `cli.ts` exits 1 on Node's own account, so `status === 1` alone would pass
// for the wrong reason.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const CLI = fileURLToPath(new URL('cli.ts', import.meta.url));

function run(...args: readonly string[]) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [CLI, ...args], { cwd: REPO, encoding: 'utf8' });
  return { status, stdout, stderr };
}

const FIXTURE_CONFIG = 'fixtures/valid-test-config.yaml';
const FIXTURES = ['--root', 'fixtures', '--config', FIXTURE_CONFIG] as const;

const REJECTED = ['--root', 'fixtures', '--config', 'fixtures/empty-rule-list-config.yaml'] as const;

describe('mh --check', () => {
  it('exits 1 when the corpus has violations', () => {
    const { status, stderr } = run('--check', ...FIXTURES);

    expect({ status, stderr }).toEqual({ status: 1, stderr: '' });
  });
});

describe('mh --query', () => {
  // `git check-attr` semantics reach the CLI: this path does not exist on disk
  // and is answered anyway. A steering answer is never a failure — the config
  // was readable and the question got an answer — so it is 0 whether a rule
  // governs the path or not.
  it('exits 0 for a path that does not exist', () => {
    const { status, stderr } = run('--query', 'docs/research/new-thing.md', ...FIXTURES);

    expect({ status, stderr }).toEqual({ status: 0, stderr: '' });
  });
});

describe('a config that cannot describe anything', () => {
  // 2 is not "worse than 1". It says the harness could not report on the corpus
  // AT ALL, because its own input is wrong — so a CI step can tell "your
  // documents need work" from "your config is broken", which are different
  // people's problems.
  it('exits 2', () => {
    const { status, stderr } = run('--check', ...REJECTED);

    expect({ status, stderr }).toEqual({ status: 2, stderr: '' });
  });
});

describe('mh --check --json', () => {
  // `--json` is public API from v1, because it is how a reimplementation is
  // verified against the corpus. So what this asserts is that the channel is
  // LOSSLESS: the artifact arrives intact, with nothing of the text channel
  // mixed into it.
  //
  // The expected counts are the build's acceptance criterion, not values
  // recomputed here the way the code computes them.
  it('writes the report as the artifact, and nothing else', () => {
    const { status, stdout, stderr } = run('--check', '--json', ...FIXTURES);

    expect({ status, stderr }).toEqual({ status: 1, stderr: '' });
    expect(stdout.startsWith('{')).toBe(true);
    const report = JSON.parse(stdout);
    expect({
      report: report.report,
      format: report.format,
      root: report.root,
      files: report.files.length,
      governed: report.totals.governed,
    }).toEqual({ report: 'check', format: 1, root: 'fixtures', files: 4, governed: 13 });
  });
});

describe('mh with no command', () => {
  // Without this, `--check` is decorative: bare `mh` would run a check anyway,
  // which makes the flag a comment rather than an instruction.
  //
  // 2 is the same 2, read as one rule rather than three cases: the harness
  // could not report on the corpus, because its own input was wrong. argv is
  // input. Nothing goes to stdout, because stdout carries the artifact and
  // there is no artifact.
  it('names the commands on stderr and exits 2', () => {
    const { status, stdout, stderr } = run();

    expect({ status, stdout }).toEqual({ status: 2, stdout: '' });
    expect(stderr).toContain('--check');
    expect(stderr).toContain('--query');
  });
});

describe('mh --check over a corpus no rule was written for', () => {
  // Tenet 6's headline promise, at the exit code: a fresh install reports zero
  // violations against a corpus it has never seen. Every rule in the fixture
  // config is rooted at `docs/`, and this root is BELOW it, so nothing is
  // governed — and nothing governed is a clean run, not an empty one.
  //
  // This is the 0 leg of the table. Without it the exit-code contract would
  // ship with its most important code unexercised.
  it('exits 0', () => {
    const { status, stderr } = run('--check', '--root', 'fixtures/docs/plain', '--config', FIXTURE_CONFIG);

    expect({ status, stderr }).toEqual({ status: 0, stderr: '' });
  });
});
