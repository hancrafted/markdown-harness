// Seam 5: the CLI — argv in, an exit code and one JSON stream out.
//
// The seam is the PROCESS boundary — argv in, an exit code and a stream out —
// because that is a CLI's whole interface and the only place an exit code is
// observable. Testing an exported `main()` instead would leave the one thing
// this slice is about untested.
//
// Most of it is the exit-code table. Two tests reach into the artifact, and
// only for facts no exit code can carry: that the report arrives intact on
// stdout, and which files the walker put in it.
//
// Every assertion pairs the exit code with stderr — empty where the command
// should be silent, matched where it should not be. A missing or throwing
// `cli.ts` exits 1 on Node's own account, so `status === 1` alone would pass
// for the wrong reason, and it did: the first red here was green on `status`.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  // 2 is not "worse than 1". It says `markdown-harness` could not report on the
  // corpus AT ALL, because its own input is wrong — so a CI step can tell "your
  // documents need work" from "your config is broken", which are different
  // people's problems.
  it('exits 2', () => {
    const { status, stderr } = run('--check', ...REJECTED);

    expect({ status, stderr }).toEqual({ status: 2, stderr: '' });
  });
});

describe('mh --check writes the artifact', () => {
  // The report is public API from v1, because it is how a reimplementation is
  // verified against the corpus. There is one channel and no flag to pick it, so
  // what this asserts is that the artifact arrives intact on stdout.
  //
  // The expected counts are the build's acceptance criterion, not values
  // recomputed here the way the code computes them.
  it('writes JSON, and nothing else', () => {
    const { status, stdout, stderr } = run('--check', ...FIXTURES);

    expect({ status, stderr }).toEqual({ status: 1, stderr: '' });
    expect(stdout.startsWith('{')).toBe(true);
    const report = JSON.parse(stdout);
    expect({
      report: report.report,
      format: report.format,
      root: report.root,
      files: report.files.length,
      governed: report.totals.governed,
    }).toEqual({ report: 'check', format: 'v1', root: 'fixtures', files: 15, governed: 24 });
  });
});

describe('mh with no command', () => {
  // Without this, `--check` is decorative: bare `mh` would run a check anyway,
  // which makes the flag a comment rather than an instruction.
  //
  // 2 is the same 2, read as one rule rather than three cases: `markdown-harness`
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

describe('mh with argv it cannot parse', () => {
  // A typo in a flag is the SAME class of problem as no command at all: the
  // input is wrong, so nothing can be reported about the corpus. Exiting 1
  // would tell a CI step the documents are at fault when the invocation was.
  it('exits 2 rather than throwing', () => {
    const { status, stdout, stderr } = run('--bogus');

    expect({ status, stdout }).toEqual({ status: 2, stdout: '' });
    expect(stderr).toContain('--bogus');
    expect(stderr).not.toContain('node:internal');
  });
});

describe('mh as `bin` invokes it', () => {
  // `package.json` points `mh` and `markdown-harness` at this file, and a `bin`
  // target is executed DIRECTLY rather than handed to `node`. Every other test
  // here spawns `process.execPath` explicitly, so all of them passed while the
  // published entry point was unrunnable — the shell read the doc comment as
  // shell script. This is the only assertion that covers the seam `bin` sells.
  it('runs itself, without node in front of it', () => {
    const { status, stderr } = spawnSync(CLI, ['--check', ...FIXTURES], { cwd: REPO, encoding: 'utf8' });

    expect({ status, stderr }).toEqual({ status: 1, stderr: '' });
  });
});

describe('mh --check over a root that holds node_modules and .git', () => {
  // The enumeration glob is the CLI's own decision, so what it REFUSES to walk
  // is part of the CLI's contract and this is the only seam where it shows.
  //
  // No other config fixture can see the walker. Each governs `docs/...`
  // explicitly, so a file the walker should never have enumerated is also a
  // file no rule selects — invisible either way, and the report is identical
  // whether the walker read it or not. `governs-everything-config.yaml` selects
  // every markdown file at any depth, so anything enumerated is GOVERNED and
  // lands in the report.
  //
  // The corpus is planted here rather than committed for two reasons, both
  // mechanical: `.gitignore` holds `node_modules/`, so a committed
  // `fixtures/node_modules/` would not survive a clone; and git refuses to
  // track any path with a `.git` component at all.
  //
  // The two legs are not equal, and saying so is the point:
  //
  //   - `node_modules/**` IS walked today. Measured at this repo's root, 262 of
  //     the 298 files `**\/*.md` finds are inside it and every one is READ.
  //     This leg is the DRIVER; it fails before the fix, twice over, because
  //     the nested copy fails the anchored spelling too.
  //   - `.git/**` is not walked, because `*` does not match a leading dot and
  //     no dot directory is reachable by this glob. This leg is a GUARD: it
  //     cannot fail today, and it is written because the exclusion has to hold
  //     UNCONDITIONALLY — for the day the glob changes, and for a port whose
  //     glob matches dotfiles.
  it('walks neither, at any depth', () => {
    const root = mkdtempSync(`${tmpdir()}/mh-walker-`);
    for (const path of [
      'kept.md',
      'node_modules/pkg/README.md',
      'packages/x/node_modules/dep.md',
      '.git/hooks/notes.md',
    ]) {
      mkdirSync(`${root}/${path}`.slice(0, `${root}/${path}`.lastIndexOf('/')), { recursive: true });
      writeFileSync(`${root}/${path}`, '# no frontmatter here\n', 'utf8');
    }

    const { status, stdout, stderr } = run(
      '--check',
      '--root',
      root,
      '--config',
      'fixtures/governs-everything-config.yaml',
    );

    expect({ status, stderr }).toEqual({ status: 1, stderr: '' });
    const report = JSON.parse(stdout);
    expect({
      files: report.files.map((file: { path: string }) => file.path),
      governed: report.totals.governed,
    }).toEqual({
      files: ['kept.md'],
      governed: 1,
    });
  });
});
