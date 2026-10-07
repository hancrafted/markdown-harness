// The mint (decision 15). A root is minted into a fresh directory under the system
// temporary directory, resolved to its real path and named by an opaque random
// identifier. It refuses when any parent holds an instruction file, copies by
// positive list and never links, and commits the seed so a readback is git status.
//
// Every effect goes through the platform Package; this file has no builtin import.

import { environment, randomHex } from '../../../platform/host-ambient.ts';
import {
  ancestorListings,
  copyTree,
  digestText,
  digestTree,
  makeDirectory,
  pathExists,
  readText,
  systemTemporaryDirectory,
  walkTree,
  writeExecutable,
  writeText,
} from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import { SHIM_PATH, hookScriptsFor, withPullLine } from '../surface/delivery-surface.pure.ts';
import { pullShimSource } from '../surface/pull-shim.pure.ts';
import { checkMintedTree, checkParentChain, heldOutViolations, isOpaquePath, planCopies } from './mint-plan.pure.ts';
import type { MintRequest, MintResult } from './mint-root.types.ts';

const CONFIG_NAME = 'markdown-harness.config.yaml';
const INSTRUCTIONS = 'AGENTS.md';
const HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.agents/skills/markdown-harness/scripts/query-hook.mjs"';
const SETTINGS = { hooks: { PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: HOOK_COMMAND }] }] } };
// The assess hook as `init.mjs` wires it, word for word: a closure test reads that file and holds the two equal.
const ASSESS_COMMAND = 'node "${CLAUDE_PROJECT_DIR}/.agents/skills/markdown-harness/scripts/assess-hook.mjs"';
const ASSESS_SETTINGS = {
  hooks: { PostToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: ASSESS_COMMAND }] }] },
};

function refusalsBefore(root: string, request: MintRequest, plan: ReturnType<typeof planCopies>): string[] {
  const parent = request.under ?? systemTemporaryDirectory();
  const opaque = isOpaquePath(root, parent) ? [] : [`the mint path ${root} names an arm or an eval`];
  const held = heldOutViolations(plan, request.heldOut).map((path) => `held-out directory in the copy plan: ${path}`);
  const parents = checkParentChain(ancestorListings(root)).map((path) => `instruction file in a parent: ${path}`);
  return [...opaque, ...held, ...parents];
}

function git(root: string, args: readonly string[]): number | null {
  const env = { PATH: environment().PATH ?? '', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const identity = ['-c', 'user.name=mint', '-c', 'user.email=mint@localhost', '-c', 'commit.gpgsign=false'];
  return runProcess({ command: 'git', args: [...identity, ...args], cwd: root, env, timeoutMs: 60_000 }).status;
}

function commitSeed(root: string): boolean {
  return [
    ['init', '-q'],
    ['add', '-A'],
    ['commit', '-q', '-m', 'seed'],
  ].every((args) => git(root, args) === 0);
}

function writeSettings(root: string, settings: object): void {
  writeText(`${root}/.claude/settings.json`, `${JSON.stringify(settings, null, 2)}\n`);
}

/** The surface's own files: a hook's wiring, or the pull command and the line that tells the agent to use it. */
function writeSurface(root: string, request: MintRequest): void {
  const { channel, encoding } = request.surface;
  if (channel === 'push') writeSettings(root, SETTINGS);
  if (channel === 'assess') writeSettings(root, ASSESS_SETTINGS);
  if (channel !== 'pull') return;
  writeExecutable(`${root}/${SHIM_PATH}`, pullShimSource(encoding));
  writeText(`${root}/${INSTRUCTIONS}`, withPullLine(readText(`${root}/${INSTRUCTIONS}`), request.pullLine));
}

function populate(root: string, request: MintRequest, plan: ReturnType<typeof planCopies>): void {
  makeDirectory(root);
  for (const step of plan) copyTree(step.from, step.to === '.' ? root : `${root}/${step.to}`);
  writeText(`${root}/${CONFIG_NAME}`, request.derivedConfig);
  writeSurface(root, request);
}

function refused(refusals: readonly string[]): MintResult {
  return { ok: false, refusals };
}

export function mintRoot(request: MintRequest): MintResult {
  const parent = request.under ?? systemTemporaryDirectory();
  const root = `${parent}/${randomHex(8)}`;
  const wanted = hookScriptsFor(request.surface);
  const hooks = request.sources.hookScripts.filter((script) =>
    wanted.includes(script.slice(script.lastIndexOf('/') + 1)),
  );
  const plan = planCopies({ ...request.sources, hookScripts: hooks });
  const refusals = [...refusalsBefore(root, request, plan), ...(pathExists(root) ? [`${root} already exists`] : [])];
  if (refusals.length > 0) return refused(refusals);
  populate(root, request, plan);
  const problems = checkMintedTree(walkTree(root, ['.git']));
  if (problems.length > 0) return refused(problems);
  if (!commitSeed(root)) return refused(['the seed could not be committed']);
  return { ok: true, root, digest: digestTree(root, ['.git']), configDigest: digestText(request.derivedConfig) };
}
