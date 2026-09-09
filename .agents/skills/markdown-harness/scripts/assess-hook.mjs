#!/usr/bin/env node
// A Claude Code `PostToolUse` hook: when the agent reads a markdown file that
// has gone stale, put the Operator's own sentence in front of it.
//
// This is a host-specific layer and nothing depends on it: the hook amplifies
// the freshness signal and is never the only way to reach it, because a document
// carries `stale_after` in plain sight either way. That is also why it ships on
// the skills channel and not in the npm tarball — the README carries that
// reasoning, and this file does not repeat it.
//
// SILENCE IS THE DEFAULT, AND EVERY REFUSAL BELOW EXITS 0. The agent has already
// read the file by the time this runs, so there is nothing left to block and
// nothing worth failing: a hook that threw would put an error in front of the
// agent over a read that succeeded. No config, no install, no rule, unparseable
// input, a rejected config — each one means this layer has nothing to say, which
// is exactly what its absence would look like.
//
// It speaks on `REVIEW` alone. `PROCEED` is silence by contract, and `FIX_FILE`
// is a repair `mh --check` already reports once in the gate — reporting it here
// would fire on every read of every governed file in a corpus that has not
// adopted `stale_after` yet, and a governance tool that talks that much gets
// switched off.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/** The one thing this hook has to say, and the only state that carries a sentence. */
const SPEAKS_ON = 'REVIEW';

/** Where `--assess` looks when no `--config` is given, and so where the root is. */
const CONFIG_NAME = 'markdown-harness.config.yaml';

/**
 * How long `mh --assess` gets before this hook gives up on it.
 *
 * Not a budget — a single-file assessment answers in milliseconds. It bounds the
 * one failure that is not a refusal: every branch below exits 0 deliberately,
 * but a subprocess that hangs exits nothing at all, and Claude Code would wait
 * out its own 600-second default on a read the agent already completed. On
 * timeout there is no usable stdout, so it lands in the same silence as the rest.
 *
 * DELETING THIS LINE IS NOT CAUGHT BY ANY TEST. A suite covering it costs five
 * seconds of wall clock on every run — it has to outwait the very bound it is
 * proving — which measured at 78% of the hook suite's runtime for one assertion,
 * so it is verified by hand instead. Reproduce it by pointing a corpus's
 * `node_modules/@hancrafted/markdown-harness/package.json` at a `bin.mh` that
 * runs `setTimeout(() => {}, 600_000)`, then feeding this hook a payload naming
 * a stale file under that corpus. Measured 2026-09-09:
 *
 *   with this line     exit 0, silent, 5048 ms
 *   without this line  still running at 20 000 ms, killed by the harness
 *
 * `spawnSync` blocks the thread, so nothing downstream can recover it — not a
 * test runner, and not this script.
 */
const GIVE_UP_AFTER_MS = 5_000;

/** Resolved from the installed package's own `bin.mh`, never hard-coded to a path under `dist/`. */
const PACKAGE_MANIFEST = join('node_modules', '@hancrafted', 'markdown-harness', 'package.json');

/**
 * The repository root, found by walking up from the file the agent read.
 *
 * Deliberately not `CLAUDE_PROJECT_DIR`, which stays pinned to the directory the
 * session started in and therefore points outside a git worktree the agent later
 * moved into — where the config it names does not exist. The config is the root
 * by definition, so looking for it answers the question directly and works the
 * same in a worktree, a subdirectory, or a monorepo package.
 *
 * Returning `undefined` is the opt-in contract holding: a tree with no config is
 * a tree nobody asked to govern.
 */
function rootHolding(file) {
  let directory = dirname(file);

  for (;;) {
    if (existsSync(join(directory, CONFIG_NAME))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/** The CLI entry the installed package declares, or `undefined` when nothing is installed to answer. */
function installedEntry(root) {
  const manifest = join(root, PACKAGE_MANIFEST);
  if (!existsSync(manifest)) return undefined;

  const declared = JSON.parse(readFileSync(manifest, 'utf8')).bin?.mh;
  if (typeof declared !== 'string') return undefined;

  const entry = resolve(dirname(manifest), declared);
  return existsSync(entry) ? entry : undefined;
}

/**
 * What the agent is told, built only from what the tool reported.
 *
 * The Operator's `instruction` travels verbatim on its own line and is never
 * wrapped, substituted for, or summarised. It is absent whenever no `assess:`
 * block reached the winning rule, and the finding is real either way — so the
 * evidence line carries the judgement when the sentence cannot.
 */
function reviewNotice(answer) {
  const { path, now, result } = answer;
  const wentStale = result.evidence?.value ?? 'an instant it did not report';
  const lines = [`markdown-harness: ${path} is past its stale_after.`];

  if (typeof result.instruction === 'string') lines.push('', result.instruction);

  lines.push('', `stale_after ${wentStale}, assessed at ${now}. Rule "${result.rule.ruleId}": ${result.rule.intent}`);
  return lines.join('\n');
}

function main() {
  const payload = JSON.parse(readFileSync(0, 'utf8'));
  const read = payload?.tool_input?.file_path;
  if (typeof read !== 'string' || read === '') return undefined;

  // Windows hands the path over with native separators, and the config's globs
  // are written with forward slashes whatever the platform.
  const file = read.split('\\').join('/');
  if (!file.toLowerCase().endsWith('.md')) return undefined;

  const root = rootHolding(file);
  if (root === undefined) return undefined;

  const entry = installedEntry(root);
  if (entry === undefined) return undefined;

  // THE PATH MUST BE RELATIVE TO THE ROOT. `--assess` anchors the config's globs
  // at the working directory and refuses `--root`, so the absolute path Claude
  // Code sends answers `ungoverned` on a corpus that is fully governed — silence
  // that looks identical to a hook working correctly. Measured 2026-09-09.
  const asked = relative(root, file).split(sep).join('/');
  const run = spawnSync(process.execPath, [entry, '--assess', asked], {
    cwd: root,
    encoding: 'utf8',
    timeout: GIVE_UP_AFTER_MS,
  });

  // ONE GATE, AND IT IS THE SHAPE RATHER THAN THE EXIT CODE. A check on
  // `run.status` reads like diligence and measures nothing: `--assess` never
  // exits 1, and its exit 2 answers either a rejection envelope carrying no
  // `agentAction` at all, or an empty stdout that does not parse. Both already
  // land where they should. Measured by deleting the status check and watching
  // every test stay green — the one mutation of six that survived.
  const answer = JSON.parse(run.stdout);
  if (answer?.result?.agentAction !== SPEAKS_ON) return undefined;

  return reviewNotice(answer);
}

let notice;
try {
  notice = main();
} catch {
  // Every throw lands here on purpose: a malformed payload, a config that moved
  // mid-run, output that is not JSON. None of them are the agent's problem.
  notice = undefined;
}

if (notice !== undefined) {
  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: notice } })}\n`,
  );
}

process.exit(0);
