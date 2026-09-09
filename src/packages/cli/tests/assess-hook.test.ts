// The Claude Code hook that ships beside the config-authoring skill, exercised
// at the process boundary an agent actually reaches it through.
//
// The hook is a Host-harness-shaped adapter, so it stays out of the npm tarball
// and ships on the skills channel instead. That also puts it outside eslint,
// tsc and knip — nothing else in the repository looks at it — which is why this
// suite exists at all.
//
// PLACEMENT HERE IS FLAGGED, NOT SETTLED. ARCH-003 §4.1 reserves a Package's
// `tests/` folder for its own integration suite through entry points, and this
// suite's subject is a script outside `src/` that reaches the CLI by spawning it
// — the CLI is a dependency of the subject rather than the subject. It sits here
// because enforcement does: measured 2026-09-09, a deliberate fourth `describe`
// block fails eslint under `src/` and passes under `.agents/`, so co-locating it
// beside the hook would trade a naming problem for a governance one. Raised as
// https://github.com/hancrafted/markdown-harness/issues/80 rather than decided.
//
// SILENCE IS THE HARD PART. Every way this hook can fail looks identical from
// outside: empty stdout, exit 0. A suite that only asserted silence would pass
// just as happily over a hook that never spoke under any condition. So every
// silent case below is paired with a speaking case it differs from by exactly
// one arranged fact, and the relativising test asserts both sides in one go.
//
// ONE BEHAVIOUR IS DELIBERATELY ABSENT, so read this suite as covering all of
// the hook but its patience. The `timeout` it puts on the CLI it spawns can only
// be proven by outwaiting it: that test measured 5045 ms against 32-155 ms for
// every test below, 78% of this file's runtime for a single assertion. It is
// verified by hand instead, and `assess-hook.mjs` carries both the measurement
// and the reproduction beside the constant they belong to.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HOOK = resolve('.agents/skills/markdown-harness/scripts/assess-hook.mjs');
const INSTALLED_AT = join('node_modules', '@hancrafted', 'markdown-harness');
const CONFIG_NAME = 'markdown-harness.config.yaml';

/**
 * The freshness dates, chosen to bracket every clock this suite could run under.
 *
 * The hook deliberately passes no `--now`, because a hook that had to format an
 * instant would carry a second way to be wrong. That leaves the host clock in
 * the loop, so the fixtures put it out of reach instead: no plausible system
 * clock sits outside the year 2000 to 2999 window, so the answer is fixed even
 * though the clock is read. `cli.test.ts` reads the host clock at this same seam
 * for the same reason.
 */
const LONG_PAST = '2000-01-01T00:00:00Z';
const FAR_FUTURE = '2999-01-01T00:00:00Z';

const STALE_INSTRUCTION = 'Re-run these steps against the live system before following them.';
const RUNBOOK_INTENT = 'A runbook that has drifted from the system it describes is worse than none';
const UNPROMPTED_INTENT = 'An unprompted note still says how fresh it is';

/**
 * A rule selecting a whole directory rather than an extension, so the hook's own
 * markdown filter is measurable.
 *
 * Governance is decided by glob and not by extension — `mh --assess` answers
 * `REVIEW` for a stale `.txt` under a rule like this one, measured 2026-09-09.
 * Without a rule of this shape in the fixture, a test asserting the hook ignores
 * a non-markdown file would pass over a hook that had no filter at all.
 */
const MIXED_INSTRUCTION = 'Check this note against what it describes.';
const MIXED_INTENT = 'Everything filed here declares how fresh it is';

const CONFIG = [
  'frontmatter:',
  '  rules:',
  '    - ruleId: runbooks',
  '      path: [docs/runbooks/**/*.md]',
  `      intent: ${RUNBOOK_INTENT}`,
  '      assess:',
  `        stale: ${STALE_INSTRUCTION}`,
  '      fields:',
  '        stale_after: { presence: required, format: datetime }',
  '    - ruleId: unprompted',
  '      path: [docs/unprompted/**/*.md]',
  `      intent: ${UNPROMPTED_INTENT}`,
  '      fields:',
  '        stale_after: { presence: required, format: datetime }',
  '    - ruleId: mixed',
  '      path: [docs/mixed/**]',
  `      intent: ${MIXED_INTENT}`,
  '      assess:',
  `        stale: ${MIXED_INSTRUCTION}`,
  '      fields:',
  '        stale_after: { presence: required, format: datetime }',
  '',
].join('\n');

/** A corpus with a config, the package installed, and one file per assessment state. */
let governed = '';
/** The same tree with no config anywhere above it: governance is opt-in, so the hook says nothing. */
let unconfigured = '';
/** A config, and no `@hancrafted/markdown-harness` to answer it. */
let uninstalled = '';
/** A config the loader rejects, which is what an Operator mid-edit has. */
let broken = '';

/** The built entry the hook will find, resolved the way the hook resolves it. */
let entry = '';

function dated(instant: string): string {
  return `---\nstale_after: ${instant}\n---\n\nbody\n`;
}

/** Point a corpus at this checkout the way `npm install` would, so `bin.mh` resolves for real. */
function install(root: string): void {
  mkdirSync(join(root, 'node_modules', '@hancrafted'), { recursive: true });
  symlinkSync(resolve('.'), join(root, INSTALLED_AT), 'junction');
}

beforeAll(() => {
  governed = mkdtempSync(join(tmpdir(), 'mh-hook-governed-'));
  mkdirSync(join(governed, 'docs', 'runbooks'), { recursive: true });
  mkdirSync(join(governed, 'docs', 'unprompted'), { recursive: true });
  mkdirSync(join(governed, 'docs', 'mixed'), { recursive: true });
  mkdirSync(join(governed, 'notes'), { recursive: true });
  writeFileSync(join(governed, CONFIG_NAME), CONFIG);
  writeFileSync(join(governed, 'docs', 'runbooks', 'stale.md'), dated(LONG_PAST));
  writeFileSync(join(governed, 'docs', 'runbooks', 'fresh.md'), dated(FAR_FUTURE));
  writeFileSync(join(governed, 'docs', 'runbooks', 'undated.md'), '---\ntitle: no date\n---\n\nbody\n');
  writeFileSync(join(governed, 'docs', 'unprompted', 'stale.md'), dated(LONG_PAST));
  writeFileSync(join(governed, 'docs', 'mixed', 'notes.txt'), dated(LONG_PAST));
  writeFileSync(join(governed, 'docs', 'mixed', 'note.md'), dated(LONG_PAST));
  writeFileSync(join(governed, 'notes', 'loose.md'), dated(LONG_PAST));
  install(governed);

  unconfigured = mkdtempSync(join(tmpdir(), 'mh-hook-unconfigured-'));
  mkdirSync(join(unconfigured, 'docs', 'runbooks'), { recursive: true });
  writeFileSync(join(unconfigured, 'docs', 'runbooks', 'stale.md'), dated(LONG_PAST));
  install(unconfigured);

  uninstalled = mkdtempSync(join(tmpdir(), 'mh-hook-uninstalled-'));
  mkdirSync(join(uninstalled, 'docs', 'runbooks'), { recursive: true });
  writeFileSync(join(uninstalled, CONFIG_NAME), CONFIG);
  writeFileSync(join(uninstalled, 'docs', 'runbooks', 'stale.md'), dated(LONG_PAST));

  // A rule with no `ruleId`, which is the fault the README shipped through
  // 0.0.2 — so the rejection this arranges is one adopters have actually had.
  broken = mkdtempSync(join(tmpdir(), 'mh-hook-broken-'));
  mkdirSync(join(broken, 'docs', 'runbooks'), { recursive: true });
  writeFileSync(join(broken, CONFIG_NAME), CONFIG.replace(/^ {4}- ruleId: runbooks$/m, '    -'));
  writeFileSync(join(broken, 'docs', 'runbooks', 'stale.md'), dated(LONG_PAST));
  install(broken);

  // Trap 9 in docs/agents/verification.md: the hook spawns a built artefact, so
  // a suite that ran against a stale `dist/` would be measuring the last build.
  // Resolved through `bin.mh` rather than hard-coded, so a moved artefact fails
  // here by name instead of turning every test below silently green.
  const manifest = join(governed, INSTALLED_AT, 'package.json');
  const declared = (JSON.parse(readFileSync(manifest, 'utf8')) as { bin?: { mh?: string } }).bin?.mh;
  if (declared === undefined) throw new Error('package.json must declare bin.mh for this suite to run');
  entry = resolve(dirname(manifest), declared);
  if (!existsSync(entry)) throw new Error(`bin.mh names "${declared}", and nothing is there — run \`npm run build\`.`);
});

afterAll(() => {
  rmSync(governed, { recursive: true, force: true });
  rmSync(unconfigured, { recursive: true, force: true });
  rmSync(uninstalled, { recursive: true, force: true });
  rmSync(broken, { recursive: true, force: true });
});

/**
 * Feed the hook one `PostToolUse` payload, shaped the way Claude Code shapes it.
 *
 * `tool_input.file_path` is documented as always absolute, which is the whole
 * reason the hook has work to do — the config's globs are anchored at the root.
 */
function onRead(root: string, filePath: string): { stdout: string; stderr: string; code: number | null } {
  const payload = {
    session_id: 'assess-hook-suite',
    cwd: root,
    hook_event_name: 'PostToolUse',
    tool_name: 'Read',
    tool_input: { file_path: filePath },
    tool_response: { filePath, success: true },
  };
  const run = spawnSync(process.execPath, [HOOK], { encoding: 'utf8', input: JSON.stringify(payload) });
  return { stdout: run.stdout, stderr: run.stderr, code: run.status };
}

/** Whatever the hook decided to put in front of the agent, or `''` when it stayed silent. */
function contextFrom(stdout: string): string {
  if (stdout.trim() === '') return '';
  const answered = JSON.parse(stdout) as { hookSpecificOutput?: { additionalContext?: string } };
  return answered.hookSpecificOutput?.additionalContext ?? '';
}

describe('the assess hook', () => {
  describe('success cases', () => {
    it("hands the agent the Operator's own sentence when the file it just read is stale", () => {
      // ARRANGE
      const nothingWrong = 0;
      const empty = '';
      const event = 'PostToolUse';
      const file = join(governed, 'docs', 'runbooks', 'stale.md');
      // ACT
      const run = onRead(governed, file);
      const answered = JSON.parse(run.stdout) as {
        hookSpecificOutput: { hookEventName: string; additionalContext: string };
      };
      // ASSERT
      expect(run.code).toBe(nothingWrong);
      expect(run.stderr).toBe(empty);
      expect(answered.hookSpecificOutput.hookEventName).toBe(event);
      expect(answered.hookSpecificOutput.additionalContext).toContain(STALE_INSTRUCTION);
    });

    it('names the file, the date it went stale, and the rule that judged it', () => {
      // ARRANGE
      // Forward slashes whatever the platform: the path is echoed back the way
      // it was asked, and it is asked the way the config's globs are written.
      const shownPath = 'docs/runbooks/stale.md';
      const ruleId = 'runbooks';
      const file = join(governed, 'docs', 'runbooks', 'stale.md');
      // ACT
      const context = contextFrom(onRead(governed, file).stdout);
      // ASSERT
      expect(context).toContain(shownPath);
      expect(context).toContain(LONG_PAST);
      expect(context).toContain(ruleId);
      expect(context).toContain(RUNBOOK_INTENT);
    });

    it('relativises the absolute path it is handed, which is the whole of its work', () => {
      // The two-sided canary. Claude Code only ever sends an absolute path, and
      // `--assess` anchors the config's globs at the working directory — so
      // handing the absolute path straight through answers `ungoverned` and the
      // hook goes quiet forever, on a corpus that is fully governed. Measured
      // 2026-09-09. The first half of this test is that failure, kept alive so
      // the second half cannot pass over nothing.
      // ARRANGE
      const unseen = 'ungoverned';
      const file = join(governed, 'docs', 'runbooks', 'stale.md');
      // ACT
      const raw = spawnSync(process.execPath, [entry, '--assess', file], { encoding: 'utf8', cwd: governed });
      const straightThrough = (JSON.parse(raw.stdout) as { result: { state: string } }).result.state;
      const throughHook = contextFrom(onRead(governed, file).stdout);
      // ASSERT
      expect(straightThrough).toBe(unseen);
      expect(throughHook).toContain(STALE_INSTRUCTION);
    });
  });

  describe('failure cases', () => {
    it('says nothing when no config governs the tree, because governance is opt-in', () => {
      // ARRANGE
      const nothingWrong = 0;
      const silent = '';
      const file = join(unconfigured, 'docs', 'runbooks', 'stale.md');
      // ACT
      const run = onRead(unconfigured, file);
      // ASSERT
      expect(run.stdout.trim()).toBe(silent);
      expect(run.code).toBe(nothingWrong);
    });

    it('says nothing when markdown-harness is not installed to answer', () => {
      // ARRANGE
      const nothingWrong = 0;
      const silent = '';
      const file = join(uninstalled, 'docs', 'runbooks', 'stale.md');
      // ACT
      const run = onRead(uninstalled, file);
      // ASSERT
      expect(run.stdout.trim()).toBe(silent);
      expect(run.code).toBe(nothingWrong);
    });

    it('says nothing when the config is broken, which is a report the gate makes', () => {
      // The likeliest real failure: an Operator mid-edit. `--assess` answers a
      // rejection envelope on stdout and exits 2, and that envelope carries no
      // `agentAction` — so the same gate that keeps `PROCEED` quiet keeps this
      // quiet too, and the hook needs no exit-code check of its own.
      // ARRANGE
      const nothingWrong = 0;
      const silent = '';
      const file = join(broken, 'docs', 'runbooks', 'stale.md');
      // ACT
      const run = onRead(broken, file);
      // ASSERT
      expect(run.stdout.trim()).toBe(silent);
      expect(run.code).toBe(nothingWrong);
    });

    it('exits 0 on input that is not JSON at all, rather than failing the tool call', () => {
      // A hook that throws puts an error in front of the agent over a file it
      // already read successfully. Tenet 11: the absence of this layer must
      // leave the floor intact, and a crash is not an absence.
      // ARRANGE
      const nothingWrong = 0;
      const silent = '';
      const notJson = 'this is not a hook payload';
      // ACT
      const run = spawnSync(process.execPath, [HOOK], { encoding: 'utf8', input: notJson });
      // ASSERT
      expect(run.stdout.trim()).toBe(silent);
      expect(run.status).toBe(nothingWrong);
    });
  });

  describe('edge cases', () => {
    it('stays silent on a file that is still fresh', () => {
      // ARRANGE
      const silent = '';
      const file = join(governed, 'docs', 'runbooks', 'fresh.md');
      // ACT
      const context = contextFrom(onRead(governed, file).stdout);
      // ASSERT
      expect(context).toBe(silent);
    });

    it('stays silent on a file no rule names', () => {
      // ARRANGE
      const silent = '';
      const file = join(governed, 'notes', 'loose.md');
      // ACT
      const context = contextFrom(onRead(governed, file).stdout);
      // ASSERT
      expect(context).toBe(silent);
    });

    it('stays silent on a governed file that cannot answer, which --check already owns', () => {
      // `unassessable` is a repair the author owes, and it would fire on every
      // read of every governed file in a corpus that has not adopted
      // `stale_after` yet. The gate reports it once; the hook would report it
      // forever, and a governance tool that talks that much gets switched off.
      // ARRANGE
      const silent = '';
      const file = join(governed, 'docs', 'runbooks', 'undated.md');
      // ACT
      const context = contextFrom(onRead(governed, file).stdout);
      // ASSERT
      expect(context).toBe(silent);
    });

    it('stays silent on a file that is not markdown, even where a rule does govern it', () => {
      // Two files, one rule, one directory, differing only in extension — so a
      // hook that lost its markdown filter goes red here instead of passing over
      // a `.txt` that no glob could have matched anyway. Governance is decided
      // by glob and not by extension: `mh --assess` answers `REVIEW` for the
      // `.txt` below when asked directly.
      // ARRANGE
      const silent = '';
      const other = join(governed, 'docs', 'mixed', 'notes.txt');
      const markdown = join(governed, 'docs', 'mixed', 'note.md');
      // ACT
      const skipped = contextFrom(onRead(governed, other).stdout);
      const sibling = contextFrom(onRead(governed, markdown).stdout);
      // ASSERT
      expect(skipped).toBe(silent);
      expect(sibling).toContain(MIXED_INSTRUCTION);
    });

    it('finds the root from the file, not from the directory the session happens to be in', () => {
      // The hook is handed a `cwd`, and using it would be the obvious thing.
      // But `--assess` anchors the config's globs at the working directory, so a
      // session started inside `docs/` — or moved into a git worktree, where
      // CLAUDE_PROJECT_DIR stays pinned to where the session began — would find
      // no config and go quiet on a corpus that is fully governed. Walking up
      // from the file to the config answers all three at once.
      // ARRANGE
      const startedIn = join(governed, 'docs');
      const file = join(governed, 'docs', 'runbooks', 'stale.md');
      // ACT
      const context = contextFrom(onRead(startedIn, file).stdout);
      // ASSERT
      expect(context).toContain(STALE_INSTRUCTION);
    });

    it('still reports a stale file whose rule configured no sentence, carrying the evidence instead', () => {
      // `instruction` is absent whenever no `assess:` block reached the winning
      // rule, and the finding is real either way. The tool writes no prose of
      // its own, so what travels here is the evidence it did report.
      // ARRANGE
      const ruleId = 'unprompted';
      const file = join(governed, 'docs', 'unprompted', 'stale.md');
      // ACT
      const context = contextFrom(onRead(governed, file).stdout);
      // ASSERT
      expect(context).toContain(LONG_PAST);
      expect(context).toContain(ruleId);
      expect(context).toContain(UNPROMPTED_INTENT);
    });
  });
});
