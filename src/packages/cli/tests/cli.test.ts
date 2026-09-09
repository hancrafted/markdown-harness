// Integration suite for the `mh` entry point, at the process boundary.
//
// Exit codes and the stdout/stderr split are contract, and neither is
// observable from inside the process. The entry file is resolved from
// `package.json`'s `bin.mh` rather than hard-coded, so a declaration that goes
// missing fails this suite instead of being quietly worked around — and since
// that declaration now names a build artefact, so does one that was never
// built.

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CONFIG = 'fixtures/conformance/valid-test-config.yaml';
const CORPUS_ROOT = 'fixtures/conformance';
const USAGE_LEAD = 'usage: mh';
const REJECTED = 'CONFIG_REJECTED';
const GOVERNED = 'governed';
const INVISIBLE = 'invisible';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  bin?: { mh?: string };
  engines?: { node?: string };
};
const declared = manifest.bin?.mh;
if (declared === undefined) throw new Error('package.json must declare bin.mh for this suite to run');
const entry = declared;

// The forgotten build, named. Measured 2026-09-07 with the guard off and
// `dist/` moved aside: 24 of this file's 26 tests failed — 15 value mismatches
// and 9 `SyntaxError: Unexpected end of JSON input` from parsing an empty
// stdout — and not one of them mentioned a build. So the suite refuses to start
// instead, in one sentence that does. The shape is the acceptance kit's own
// runner's, which refuses when the manifest declares no entry and names the
// manifest key in its message.
//
// The ordinary path never meets this, because `npm run verify` builds before it
// tests. It exists for the direct and watch-mode runs that bypass that chain.
if (!existsSync(entry)) {
  throw new Error(`package.json bin.mh names "${entry}", and nothing is there — run \`npm run build\` first.`);
}

/**
 * The supported Node range, read off the manifest rather than written out here.
 *
 * An adopter's installer reads `engines.node`; the command prints its own range
 * when it refuses. Asserting that the printed text carries this value is what
 * keeps the two from drifting apart — there is no third place to check.
 */
const engines = manifest.engines?.node;
if (engines === undefined) throw new Error('package.json must declare engines.node for this suite to run');

/**
 * A corpus planted in a tmpdir, with a config that governs every markdown file
 * the walker enumerates.
 *
 * The refusals are only observable under a config broad enough to select what
 * the walker should never have handed over: a file no rule selects is invisible
 * either way, so a narrower config reads the same whether the walker refused
 * `node_modules/` or not.
 */
let planted = '';
let plantedConfig = '';

/**
 * A corpus with nothing wrong with it, so exit 0 can be proven.
 *
 * `fixtures/conformance/` is built to fail, and a `--check` that always exited
 * 1 would satisfy every other assertion in this file.
 */
let conforming = '';
let conformingConfig = '';

/**
 * A corpus holding one governed file the walker enumerates and the read edge
 * cannot open.
 *
 * It has to be a PERMISSION. Every other way a read refuses — a directory, a
 * dangling symlink, a socket — the walker already declines to enumerate, so
 * mode 000 is the only arrangement that reaches this branch at the process
 * boundary at all. That buys one dependency on ambient state, and `denied`
 * below is what stops it turning into a test that passes without testing.
 */
let locked = '';
let lockedConfig = '';
let lockedFile = '';
let sealed = '';

/** Where the one-line Node-version stand-ins are written. See `mhOnNode`. */
let shimmed = '';

/** What a mode-000 file gives THIS uid when the arrangement worked. */
const REFUSED = 'refused';

/**
 * What opening a mode-000 file gives THIS uid.
 *
 * A uid that bypasses the mode bit reads the file anyway, and the refusal under
 * test would never fire — leaving a green assertion about a condition that was
 * never arranged. So the one test that needs it asserts this first.
 *
 * Returns a SENTENCE rather than a boolean, and the difference is the failure
 * message: `expected 'opened anyway ...' to be 'refused'` names what happened,
 * where `expected false to be true` would leave the reader to guess whether the
 * chmod failed, the uid is privileged, or the file was never planted.
 */
function openingGives(path: string): string {
  try {
    readFileSync(path, 'utf8');
    return 'opened anyway — this uid bypasses the mode bit';
  } catch {
    return REFUSED;
  }
}

beforeAll(() => {
  planted = mkdtempSync(join(tmpdir(), 'mh-cli-audit-'));

  mkdirSync(join(planted, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(join(planted, '.git'), { recursive: true });

  writeFileSync(join(planted, 'kept.md'), '');
  writeFileSync(join(planted, 'node_modules', 'pkg', 'refused.md'), '');
  writeFileSync(join(planted, '.git', 'refused.md'), '');

  shimmed = mkdtempSync(join(tmpdir(), 'mh-node-shim-'));

  conforming = mkdtempSync(join(tmpdir(), 'mh-check-clean-'));
  writeFileSync(join(conforming, 'ok.md'), '---\ntype: note\n---\n');
  conformingConfig = join(conforming, 'clean.config.yaml');
  writeFileSync(
    conformingConfig,
    [
      'frontmatter:',
      '  rules:',
      '    - ruleId: every-markdown-file',
      "      path: ['**/*.md']",
      '      intent: Every markdown file says what it is',
      '      fields:',
      '        type:',
      '          presence: required',
      '',
    ].join('\n'),
  );

  locked = mkdtempSync(join(tmpdir(), 'mh-check-locked-'));
  writeFileSync(join(locked, 'readable.md'), '---\ntype: note\n---\n');
  lockedFile = join(locked, 'sealed.md');
  writeFileSync(lockedFile, '---\ntype: note\n---\n');
  chmodSync(lockedFile, 0o000);
  // Recorded, not thrown. A throw here would abort every test in this file over
  // a condition only one of them needs; the test that needs it asserts it.
  sealed = openingGives(lockedFile);
  lockedConfig = join(locked, 'locked.config.yaml');
  writeFileSync(
    lockedConfig,
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
  if (lockedFile !== '') chmodSync(lockedFile, 0o644);
  rmSync(locked, { recursive: true, force: true });
  rmSync(planted, { recursive: true, force: true });
  rmSync(conforming, { recursive: true, force: true });
  rmSync(shimmed, { recursive: true, force: true });
});

/** Run the built entry file the way a caller would, and report all three channels. */
function mh(...args: readonly string[]): { stdout: string; stderr: string; code: number | null } {
  const run = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' });
  return { stdout: run.stdout, stderr: run.stderr, code: run.status };
}

/**
 * Run the entry under a STATED Node version rather than under this one.
 *
 * The runtime floor is only observable from a Node the floor rejects, and there
 * is no such Node here to run on. The honest way to arrange one is to hand the
 * spawned process a stand-in for the single ambient read the floor makes — one
 * line, written out below where a reader can see it does nothing else. It runs
 * in the CHILD, so this suite's own process keeps its real version, and the
 * shipped code carries no test hook: `process.versions.node` is what every real
 * Node reports and what the floor reads.
 *
 * `defineProperty` rather than assignment: the property is read-only, and a
 * plain write is discarded without a word outside strict mode.
 */
function mhOnNode(
  version: string,
  ...args: readonly string[]
): { stdout: string; stderr: string; code: number | null } {
  const shim = join(shimmed, `node-${version}.mjs`);
  const stand = `Object.defineProperty(process.versions, 'node', { value: ${JSON.stringify(version)} });\n`;
  writeFileSync(shim, stand);

  const run = spawnSync(process.execPath, ['--import', pathToFileURL(shim).href, entry, ...args], {
    encoding: 'utf8',
  });
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
      const declaredRules = 10;
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

    it('defaults the bare invocation to --check and rejects the missing default config', () => {
      // A CONTRACT CHANGE from the phase that refused `--check` as a usage
      // error: the bare invocation now runs, with both documented defaults
      // applied, and fails on the config rather than on the argv.
      // ARRANGE
      const refused = 2;
      const checking = 'check';
      const notFound = 'CONFIG_NOT_FOUND';
      const empty = '';
      // ACT
      const run = mh();
      const body = JSON.parse(run.stdout);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stderr).toBe(empty);
      expect(body.command).toBe(checking);
      expect(body.result.faults.map((fault: { code: string }) => fault.code)).toEqual([notFound]);
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

// ---------------------------------------------------------------------------
// mh --check against the conformance corpus.
// ---------------------------------------------------------------------------

describe('mh --check', () => {
  describe('success cases', () => {
    it('reproduces the expected conformance verdict and exits 1', () => {
      // ARRANGE
      const summary = { governedFiles: 39, invalidFiles: 25, totalViolations: 29 };
      const corpusIsWrong = 1;
      const empty = '';
      // ACT
      const run = mh('--check', '--root', CORPUS_ROOT, '--config', CONFIG);
      const body = JSON.parse(run.stdout);
      // ASSERT
      expect(body.result.summary).toEqual(summary);
      expect(run.code).toBe(corpusIsWrong);
      expect(run.stderr).toBe(empty);
    });

    it('lists every file carrying a violation, in walker order', () => {
      // ARRANGE
      const paths = [
        'docs/datasets/quarterly-usage.md',
        'docs/freshness/undated.md',
        'docs/plain/blank-type.md',
        'docs/plain/broken/index.md',
        'docs/plain/broken/listed.md',
        'docs/plain/broken/mangled.md',
        'docs/plain/broken/unterminated.md',
        'docs/plain/empty-block.md',
        'docs/plain/index.md',
        'docs/plain/prose-only.md',
        'docs/plain/untyped.md',
        'docs/reference/draft-page.md',
        'docs/reference/legacy.md',
        'docs/research/blank-description.md',
        'docs/research/index.md',
        'docs/research/long-tag.md',
        'docs/research/overtagged.md',
        'docs/research/unsourced.md',
        'docs/research/untagged.md',
        'docs/skills/anonymous/SKILL.md',
        'docs/skills/legacy/SKILL.md',
        'docs/workflows/listed-title.md',
        'docs/workflows/onboarding.md',
        'docs/workflows/tagging.md',
        'docs/workflows/untitled.md',
      ];
      // ACT
      const run = mh('--check', '--root', CORPUS_ROOT, '--config', CONFIG);
      const actual = JSON.parse(run.stdout).result.files.map((file: { path: string }) => file.path);
      // ASSERT
      expect(actual).toEqual(paths);
    });

    it('reaches all nineteen violation codes', () => {
      // The corpus is built to reach every one.
      // ARRANGE
      const codes = [
        'ALL_OF_UNSATISFIED',
        'ANY_OF_UNSATISFIED',
        'CONSTRAINT_SHAPE_MISMATCH',
        'EMPTY_REQUIRED_FIELD',
        'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
        'EXACTLY_ONE_OF_NONE_PRESENT',
        'FORBIDDEN_FIELD_PRESENT',
        'FORMAT_MISMATCH',
        'FRONTMATTER_FORBIDDEN',
        'FRONTMATTER_UNPARSEABLE',
        'ITEM_TOO_LONG',
        'MISSING_REQUIRED_FIELD',
        'PATTERN_MISMATCH',
        'TOO_FEW_ITEMS',
        'TOO_MANY_ITEMS',
        'UNKNOWN_KEY_FORBIDDEN',
        'VALUE_NOT_ALLOWED',
        'VALUE_TOO_LONG',
        'VALUE_TOO_SHORT',
      ];
      // ACT
      const run = mh('--check', '--root', CORPUS_ROOT, '--config', CONFIG);
      const files = JSON.parse(run.stdout).result.files as { violations: { violation: string }[] }[];
      const reached = files.flatMap((file) => file.violations.map((found) => found.violation));
      // ASSERT
      expect([...new Set(reached)].sort()).toEqual(codes);
    });
  });

  describe('failure cases', () => {
    it('reports a too-short title with the rule that won the file and its intent', () => {
      // ARRANGE
      const row = {
        path: 'docs/workflows/tagging.md',
        ruleId: 'workflows',
        ruleIntent: 'A workflow names itself and says when to reach for it',
        violations: [
          {
            field: 'title',
            value: 'Go',
            violation: 'VALUE_TOO_SHORT',
            requirement: { minLength: 3, maxLength: 80 },
          },
        ],
      };
      // ACT
      const run = mh('--check', '--root', CORPUS_ROOT, '--config', CONFIG);
      const files = JSON.parse(run.stdout).result.files as { path: string }[];
      const actual = files.find((file) => file.path === row.path);
      // ASSERT
      expect(actual).toEqual(row);
    });

    it('names a governed file it cannot open, rather than printing the usage text', () => {
      // Exit 2 was already right — "could not report at all". The CHANNEL was
      // not: the invocation was well formed and the walker accepted the root, so
      // a synopsis sent the Operator to check flags that were never wrong, and
      // nothing anywhere named the file. §2 rule 3 tells the two exit-2 flavours
      // apart by what the channel says, and this said the other one's line.
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      // ACT
      const run = mh('--check', '--root', locked, '--config', lockedConfig);
      // ASSERT
      expect(sealed).toBe(REFUSED);
      expect(run.code).toBe(cannotReport);
      expect(run.stdout).toBe(empty);
      expect(run.stderr).toContain(lockedFile);
      expect(run.stderr).not.toContain(USAGE_LEAD);
    });
  });

  describe('edge cases', () => {
    it('leaves the conformance tree untouched, having only read it', () => {
      // Compares the tree BEFORE the run against the tree AFTER it, rather than
      // asserting the tree is pristine. The pristine form conflated two
      // different claims — "the tool wrote nothing" and "the developer has
      // nothing uncommitted" — and only the first is this test's subject.
      //
      // It also made the suite unrunnable during any change to the corpus: a
      // staged edit under `fixtures/conformance/` shows in `--porcelain` too, so
      // the pre-commit hook failed on the very commit that added a Conformance
      // case. Measured 2026-09-09, on the first commit to touch the corpus since
      // the assertion took that form. Proven still able to fail by writing a
      // file between the two captures.
      // ARRANGE
      const treeBefore = spawnSync('git', ['status', '--porcelain', CORPUS_ROOT], { encoding: 'utf8' }).stdout;
      // ACT
      mh('--check', '--root', CORPUS_ROOT, '--config', CONFIG);
      const treeAfter = spawnSync('git', ['status', '--porcelain', CORPUS_ROOT], { encoding: 'utf8' }).stdout;
      // ASSERT
      expect(treeAfter).toBe(treeBefore);
    });

    it('exits 0 on a corpus with nothing wrong with it', () => {
      // ARRANGE
      const nothingWrong = 0;
      const clean = { governedFiles: 1, invalidFiles: 0, totalViolations: 0 };
      // ACT
      const run = mh('--check', '--root', conforming, '--config', conformingConfig);
      // ASSERT
      expect(run.code).toBe(nothingWrong);
      expect(JSON.parse(run.stdout).result.summary).toEqual(clean);
    });
  });
});

// ---------------------------------------------------------------------------
// `--help`, at the same process seam.
// ---------------------------------------------------------------------------
//
// The one command that reads nothing. Every assertion below is about a channel
// or an exit code rather than about wording, because the wording is prose that
// should be free to improve without a test failing.

/**
 * Run the built entry from a STATED directory.
 *
 * `--assess` anchors the config's globs at the current directory, because it
 * names one file rather than a corpus and refuses `--root`. The Conformance
 * config's globs are written relative to `fixtures/conformance/`, so the only
 * honest way to exercise it at the process boundary is to stand where an
 * Operator running that config would stand.
 *
 * The entry is resolved to an ABSOLUTE path first. `bin.mh` is declared
 * relative to the package root, so spawning it from anywhere else would look
 * for the artefact under the wrong directory and report a Node module error as
 * though the command had refused the invocation.
 */
function mhIn(cwd: string, ...args: readonly string[]): { stdout: string; stderr: string; code: number | null } {
  const run = spawnSync(process.execPath, [resolve(entry), ...args], { encoding: 'utf8', cwd });
  return { stdout: run.stdout, stderr: run.stderr, code: run.status };
}

/** The Conformance config, named from inside the corpus root rather than from the repo root. */
const LOCAL_CONFIG = 'valid-test-config.yaml';
const STALE_CASE = 'docs/freshness/stale.md';
const PINNED = '2026-12-01T00:00:00Z';

describe('mh --assess', () => {
  describe('success cases', () => {
    it("answers a stale file with the Operator's sentence, echoes the instant, and exits 0", () => {
      // ARRANGE
      const expected = {
        command: 'assess',
        now: PINNED,
        agentAction: 'REVIEW',
        instruction: 'Re-verify this against the source before quoting it, then move stale_after.',
        code: 0,
      };
      // ACT
      const run = mhIn(CORPUS_ROOT, '--assess', STALE_CASE, '--config', LOCAL_CONFIG, '--now', PINNED);
      const answered = JSON.parse(run.stdout) as {
        command: string;
        now: string;
        result: { agentAction: string; instruction: string };
      };
      const actual = {
        command: answered.command,
        now: answered.now,
        agentAction: answered.result.agentAction,
        instruction: answered.result.instruction,
        code: run.code,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('echoes an instant a caller could hand straight back, when none was given', () => {
      // The replayability claim at the process boundary: with no `--now`, the
      // clock is read once and the value it produced is echoed — and it is a
      // value this same command accepts. So a run nobody pinned can be
      // reproduced exactly by pinning what it printed.
      //
      // Deliberately asserts the two runs AGREE rather than naming a verb: the
      // undefaulted run is judged against the real clock, so which verb it
      // reaches depends on the day this suite runs. Replayability does not.
      // ARRANGE
      const instantShape = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
      const nothingWrong = 0;
      // ACT
      const first = mhIn(CORPUS_ROOT, '--assess', STALE_CASE, '--config', LOCAL_CONFIG);
      const echoed = (JSON.parse(first.stdout) as { now: string }).now;
      const again = mhIn(CORPUS_ROOT, '--assess', STALE_CASE, '--config', LOCAL_CONFIG, '--now', echoed);
      const firstAnswer = (JSON.parse(first.stdout) as { result: { agentAction: string } }).result.agentAction;
      const replayed = (JSON.parse(again.stdout) as { result: { agentAction: string } }).result.agentAction;
      // ASSERT
      expect(echoed).toMatch(instantShape);
      expect(replayed).toBe(firstAnswer);
      expect(again.code).toBe(nothingWrong);
    });
  });

  describe('failure cases', () => {
    it('refuses an instant it could not compare against, on stderr, with nothing on stdout', () => {
      // ARRANGE
      const empty = '';
      const cannotReport = 2;
      // ACT
      const run = mhIn(CORPUS_ROOT, '--assess', STALE_CASE, '--config', LOCAL_CONFIG, '--now', '2026-02-30T00:00:00Z');
      // ASSERT
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
      expect(run.stdout).toBe(empty);
      expect(run.code).toBe(cannotReport);
    });

    it('refuses an instant beside the one command that must stay clock-free', () => {
      // ARRANGE
      const empty = '';
      const cannotReport = 2;
      // ACT
      const run = mhIn(CORPUS_ROOT, '--check', '--config', LOCAL_CONFIG, '--now', PINNED);
      // ASSERT
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
      expect(run.stdout).toBe(empty);
      expect(run.code).toBe(cannotReport);
    });
  });

  describe('edge cases', () => {
    it('refuses a root beside an assessment, which answers about one path', () => {
      // ARRANGE
      const empty = '';
      const cannotReport = 2;
      // ACT
      const run = mhIn(CORPUS_ROOT, '--assess', STALE_CASE, '--root', '.', '--config', LOCAL_CONFIG);
      // ASSERT
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
      expect(run.stdout).toBe(empty);
      expect(run.code).toBe(cannotReport);
    });

    it('reports a config it could not trust in the same envelope, on stdout, and exits 2', () => {
      // The shared rejection contract, unchanged by this command: the payload
      // goes to stdout and stderr stays empty, so the channel tells a config
      // failure from a usage failure without reading the number.
      // ARRANGE
      const expected = { error: REJECTED, command: 'assess', stderr: '', code: 2 };
      // ACT
      const run = mhIn(CORPUS_ROOT, '--assess', STALE_CASE, '--config', 'nothing-here.yaml', '--now', PINNED);
      const answered = JSON.parse(run.stdout) as { command: string; result: { error: string } };
      const actual = { error: answered.result.error, command: answered.command, stderr: run.stderr, code: run.code };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names --assess and --now in the synopsis it prints when refused', () => {
      // The synopsis is the only thing stderr ever carries, so a command absent
      // from it is a command a refused caller cannot discover.
      // ARRANGE
      const assessFlag = '--assess';
      const nowFlag = '--now';
      // ACT
      const printed = mhIn(CORPUS_ROOT, '--assess', STALE_CASE, '--now', 'yesterday').stderr;
      // ASSERT
      expect(printed).toContain(assessFlag);
      expect(printed).toContain(nowFlag);
    });
  });
});

describe('mh --help', () => {
  describe('success cases', () => {
    it('answers on stdout and exits 0', () => {
      // A question, not a mistake: the answer goes to the success channel.
      // ARRANGE
      const nothingWrong = 0;
      const empty = '';
      // ACT
      const run = mh('--help');
      // ASSERT
      expect(run.code).toBe(nothingWrong);
      expect(run.stderr).toBe(empty);
      expect(run.stdout.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
    });

    it('names all three reporting commands and the exit codes a caller must read', () => {
      // What an agent cannot infer from a synopsis, and so the part worth pinning.
      // ARRANGE
      const commands = ['--check', '--query', '--audit'];
      const contract = 'CONFIG_REJECTED';
      const reference = 'https://github.com/hancrafted/markdown-harness';
      // ACT
      const help = mh('--help').stdout;
      // ASSERT
      for (const command of commands) expect(help).toContain(command);
      expect(help).toContain(contract);
      expect(help).toContain(reference);
    });
  });

  describe('failure cases', () => {
    it('refuses help beside a real command, on stderr and exit 2', () => {
      // `--check --help` names two questions. Answering either one silently is
      // the precedence this tool does not do.
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--check', '--help');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
    });
  });

  describe('edge cases', () => {
    it('answers where the default command cannot, having opened no config', () => {
      // Run from the repo root, where `markdown-harness.config.yaml` does not
      // exist: the bare invocation exits 2 for the missing default config, so
      // help exiting 0 in the same directory is evidence it read no config at
      // all rather than evidence it found one.
      // ARRANGE
      const nothingWrong = 0;
      const cannotReport = 2;
      // ACT
      const help = mh('--help');
      const bare = mh();
      // ASSERT
      expect(bare.code).toBe(cannotReport);
      expect(help.code).toBe(nothingWrong);
    });

    it('opens with the very text a refusal puts on stderr, so the two cannot drift', () => {
      // The help text is BUILT from the usage text. Asserting the containment
      // rather than the wording is what keeps that true after an edit to either.
      // ARRANGE
      const refusedArgv = '--verbose';
      // ACT
      const refusal = mh(refusedArgv).stderr;
      const help = mh('--help').stdout;
      // ASSERT
      expect(refusal.length).toBeGreaterThan(0);
      expect(help.slice(0, refusal.length)).toBe(refusal);
    });
  });
});

// ---------------------------------------------------------------------------
// The runtime floor, at the same process seam.
// ---------------------------------------------------------------------------
//
// `engines` is advisory — npm enforces it only for an adopter who opted into
// strictness — so the command refuses for itself rather than trusting the
// installer to have done it. What that protects is tenet 3: path matching
// delegates to the platform's glob matcher, whose behaviour is fixed by the
// matcher bundled with each Node release, and outside the declared range the
// same tree gives a different result out. A refusal is the only honest answer
// available there, and it is preferable to a quietly different one.

describe('mh under a stated Node version', () => {
  describe('success cases', () => {
    it('answers normally on the first release of the upper window', () => {
      // ARRANGE
      const supported = '26.1.0';
      const success = 0;
      const empty = '';
      // ACT
      const run = mhOnNode(supported, '--query', 'docs/reference/api-limits.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.governance).toBe(GOVERNED);
    });
  });

  describe('failure cases', () => {
    it('refuses a Node the range excludes, naming the range on stderr, and exits 2', () => {
      // A THIRD thing stderr carries, and deliberately so: the usage text
      // answers "what did you ask for", and this answers "not on this machine".
      // Both are refusals to report at all, which is what stderr is for here.
      // ARRANGE
      const unsupported = '25.4.0';
      const refused = 2;
      const empty = '';
      // ACT
      const run = mhOnNode(unsupported, '--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr).toContain(engines);
      expect(run.stderr).toContain(unsupported);
    });

    it('refuses before it reads anything, so a doomed invocation still names the runtime', () => {
      // The bare invocation would otherwise reject a missing default config on
      // stdout and exit 2 for THAT reason. Both exit 2, so the channel is the
      // only thing telling "wrong runtime" from "wrong config" apart — and only
      // one of the two is worth an Operator's next five minutes.
      // ARRANGE
      const unsupported = '22.20.0';
      const refused = 2;
      const empty = '';
      // ACT
      const run = mhOnNode(unsupported);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr).toContain(engines);
    });
  });

  describe('edge cases', () => {
    it('takes each window at its first release and refuses the release below it', () => {
      // Written out by hand, because the boundaries ARE the decision. A
      // prerelease is read as its release: `26.1.0-rc.1` is below `26.1.0` to
      // semver, and refusing it would be a refusal about version syntax rather
      // than about matcher behaviour, which is the only thing at stake.
      // ARRANGE
      const nothingWrong = 0;
      const cannotReport = 2;
      const boundaries = [
        { version: '22.20.0', code: cannotReport },
        { version: '24.15.9', code: cannotReport },
        { version: '24.16.0', code: nothingWrong },
        { version: '24.99.0', code: nothingWrong },
        { version: '25.0.0', code: cannotReport },
        { version: '26.0.9', code: cannotReport },
        { version: '26.1.0', code: nothingWrong },
        { version: '26.1.0-rc.1', code: nothingWrong },
        { version: '27.0.0', code: nothingWrong },
      ];
      // ACT
      const actual = boundaries.map(({ version }) => ({
        version,
        code: mhOnNode(version, '--query', 'README.md', '--config', CONFIG).code,
      }));
      // ASSERT
      expect(actual).toEqual(boundaries);
    });

    it('refuses a version it cannot read rather than assuming it is new enough', () => {
      // Nothing reports this; a nightly reports `27.0.0-nightly…`, which parses.
      // What the case pins is the direction of the doubt.
      // ARRANGE
      const unreadable = 'not-a-version';
      const refused = 2;
      const empty = '';
      // ACT
      const run = mhOnNode(unreadable, '--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr).toContain(engines);
    });
  });
});
