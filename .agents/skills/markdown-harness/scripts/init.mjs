#!/usr/bin/env node
// Set markdown-harness up in a repository, deterministically.
//
// The judgement belongs to the skill and the mechanics belong here. The skill
// decides WHICH script is the gate — that needs reading CI and cannot be guessed
// — and passes it in. Everything below is then fixed: same inputs, same edits,
// same report, and running it twice changes nothing the second time.
//
// Every step is skipped when it is already done, so this is safe to re-run after
// a partial failure. It reports as JSON on stdout so the skill can read what it
// did rather than parse prose.
//
//   node init.mjs --gate verify [--dry-run] [--no-hook]

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PACKAGE = '@hancrafted/markdown-harness';
const CHECK = 'mh --check';
const MEMORY_DIR = join('docs', 'markdown-harness');
const HOOK_COMMAND = 'node "${CLAUDE_PROJECT_DIR}/.agents/skills/markdown-harness/scripts/assess-hook.mjs"';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at === -1 || at + 1 >= argv.length ? fallback : argv[at + 1];
};

const dryRun = flag('--dry-run');
const gate = value('--gate', 'verify');
const wantHook = !flag('--no-hook');

/** The repository root, which is the directory holding package.json. */
function repoRoot() {
  let directory = process.cwd();
  for (;;) {
    if (existsSync(join(directory, 'package.json'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Two-space indent and a trailing newline, which is what prettier leaves behind. */
function writeJson(path, value) {
  if (dryRun) return;
  writeFileSync(path, `${JSON.stringify(value, undefined, 2)}\n`);
}

const root = repoRoot();
if (root === undefined) {
  process.stdout.write(
    `${JSON.stringify({ ok: false, error: 'NO_PACKAGE_JSON', cwd: process.cwd() }, undefined, 2)}\n`,
  );
  process.exit(1);
}

const manifestPath = join(root, 'package.json');
const steps = [];

// 1. THE DEPENDENCY. Resolved from package.json rather than from `mh` being on
//    PATH: a global install answers `mh --help` while leaving CI without it.
{
  const manifest = readJson(manifestPath);
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };

  if (declared[PACKAGE] !== undefined) {
    steps.push({ step: 'dependency', done: 'already', detail: `${PACKAGE}@${declared[PACKAGE]}` });
  } else if (dryRun) {
    steps.push({ step: 'dependency', done: 'would-install', detail: PACKAGE });
  } else {
    const run = spawnSync('npm', ['install', '--save-dev', PACKAGE], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    steps.push(
      run.status === 0
        ? { step: 'dependency', done: 'installed', detail: PACKAGE }
        : { step: 'dependency', done: 'failed', detail: (run.stderr || '').trim().split('\n').slice(-3).join(' ') },
    );
  }
}

// 2. THE GATE. Appended last, so the cheap checks fail first. `&&` is what makes
//    exit 1 and exit 2 both fail the build, so neither is swallowed.
{
  const manifest = readJson(manifestPath);
  manifest.scripts ??= {};
  const existing = manifest.scripts[gate];

  if (typeof existing === 'string' && existing.includes(CHECK)) {
    steps.push({ step: 'gate', done: 'already', detail: `${gate}: ${existing}` });
  } else if (typeof existing === 'string') {
    manifest.scripts[gate] = `${existing} && ${CHECK}`;
    writeJson(manifestPath, manifest);
    steps.push({
      step: 'gate',
      done: dryRun ? 'would-extend' : 'extended',
      detail: `${gate}: ${manifest.scripts[gate]}`,
    });
  } else {
    manifest.scripts[gate] = CHECK;
    writeJson(manifestPath, manifest);
    steps.push({ step: 'gate', done: dryRun ? 'would-create' : 'created', detail: `${gate}: ${CHECK}` });
  }
}

// 3. THE FOLDER. Empty directories do not survive a clone, so it carries a
//    .gitkeep. It is where the demo lands, and where repo-specific notes go later.
{
  const keep = join(root, MEMORY_DIR, '.gitkeep');
  if (existsSync(keep)) {
    steps.push({ step: 'folder', done: 'already', detail: MEMORY_DIR });
  } else {
    if (!dryRun) {
      mkdirSync(join(root, MEMORY_DIR), { recursive: true });
      writeFileSync(keep, '');
    }
    steps.push({ step: 'folder', done: dryRun ? 'would-create' : 'created', detail: MEMORY_DIR });
  }
}

// 4. THE HOOK, and only under Claude Code. `CLAUDECODE` is set in hook commands
//    and in tool subprocesses, so it answers "is this host the one that can run
//    the hook" without asking. Hook entries MERGE across settings levels rather
//    than replacing each other, and identical entries dedupe to one run — so
//    adding this beside a user's own global entry is safe.
if (!wantHook) {
  steps.push({ step: 'hook', done: 'skipped', detail: '--no-hook' });
} else if (process.env.CLAUDECODE !== '1') {
  steps.push({ step: 'hook', done: 'skipped', detail: 'not running under Claude Code' });
} else {
  const settingsPath = join(root, '.claude', 'settings.json');
  const settings = existsSync(settingsPath) ? readJson(settingsPath) : {};
  settings.hooks ??= {};
  settings.hooks.PostToolUse ??= [];

  const already = settings.hooks.PostToolUse.some((entry) =>
    (entry?.hooks ?? []).some((h) => h?.command === HOOK_COMMAND),
  );

  if (already) {
    steps.push({ step: 'hook', done: 'already', detail: settingsPath });
  } else {
    settings.hooks.PostToolUse.push({
      matcher: 'Read',
      hooks: [{ type: 'command', command: HOOK_COMMAND }],
    });
    if (!dryRun) mkdirSync(dirname(settingsPath), { recursive: true });
    writeJson(settingsPath, settings);
    steps.push({ step: 'hook', done: dryRun ? 'would-wire' : 'wired', detail: settingsPath });
  }
}

const failed = steps.filter((s) => s.done === 'failed');
process.stdout.write(`${JSON.stringify({ ok: failed.length === 0, root, dryRun, steps }, undefined, 2)}\n`);
process.exit(failed.length === 0 ? 0 : 1);
