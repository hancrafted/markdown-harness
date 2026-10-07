// One trial, end to end, with no model unless the Host harness is a real one:
// mint, sweep, rungs 1 and 2 before the session, then the session itself.

import { environment, nodeExecutable, nowMs, randomHex } from '../../../platform/host-ambient.ts';
import {
  copyFile,
  digestFile,
  digestTree,
  makeDirectory,
  pathExists,
  readText,
  readTextFiles,
  removeTree,
  systemTemporaryDirectory,
} from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import type { FailureKind } from '../failure/failure-classifier.types.ts';
import { driverOf } from '../host/host-driver.pure.ts';
import { profileOf } from '../host/host-profile.pure.ts';
import { credentialCopies } from '../host/scratch-home.pure.ts';
import { sweepForSteeringMarker } from '../leak/leak-sweep.pure.ts';
import { mintRoot } from '../mint/mint-root.impure.ts';
import {
  checkAssessRung1,
  checkPullAnswer,
  checkRung1,
  checkRung2,
  pullFailureKind,
} from '../preflight/preconditions.pure.ts';
import { SHIM_PATH, allowedToolsFor, hookScriptsFor, toolsFor } from '../surface/delivery-surface.pure.ts';
import type { TrialOutcome, TrialRequest } from './trial.types.ts';

const MH_ENTRY = 'node_modules/@hancrafted/markdown-harness/dist/packages/cli/cli.js';
const SKILL_SCRIPTS = '.agents/skills/markdown-harness/scripts';
const HOOK_SCRIPT = `${SKILL_SCRIPTS}/query-hook.mjs`;
const ASSESS_SCRIPT = `${SKILL_SCRIPTS}/assess-hook.mjs`;
const PREFLIGHT_MS = 30_000;

type Declared = { kind: FailureKind; detail: string } | undefined;

function toolEnvironment(): Record<string, string> {
  return { PATH: environment().PATH ?? '' };
}

function runNode(root: string, args: readonly string[], input: string): { stdout: string; status: number | null } {
  const report = runProcess({
    command: nodeExecutable(),
    args,
    cwd: root,
    env: toolEnvironment(),
    timeoutMs: PREFLIGHT_MS,
    input,
  });
  return { stdout: report.stdout, status: report.status };
}

function pushProblem(root: string, request: TrialRequest, steeringMarkers: readonly string[]): Declared {
  if (request.arm !== 'steered') return undefined;
  const payload = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${root}/${request.targetPath}` } });
  const rung2 = checkRung2(runNode(root, [`${root}/${HOOK_SCRIPT}`], payload).stdout, steeringMarkers);
  return rung2 === undefined ? undefined : { kind: 'rung-2-failed', detail: rung2 };
}

/** Rung 2 on the assess surface: the assess hook, fed the Read payload the Host harness would send, must render the steering marker. */
function assessProblem(root: string, request: TrialRequest, steeringMarkers: readonly string[]): Declared {
  if (request.arm !== 'steered') return undefined;
  const payload = JSON.stringify({ tool_name: 'Read', tool_input: { file_path: `${root}/${request.targetPath}` } });
  const rung2 = checkRung2(runNode(root, [`${root}/${ASSESS_SCRIPT}`], payload).stdout, steeringMarkers);
  return rung2 === undefined ? undefined : { kind: 'rung-2-failed', detail: rung2 };
}

/** The pull command is run as the agent will run it; the encoding names the failure (see `pullFailureKind`). */
function pullProblem(root: string, request: TrialRequest, steeringMarkers: readonly string[]): Declared {
  const printed = runNode(root, [`${root}/${SHIM_PATH}`, 'query', request.targetPath], '').stdout;
  const problem = checkPullAnswer(printed, steeringMarkers, request.arm);
  if (problem === undefined) return undefined;
  return { kind: pullFailureKind(request.surface.encoding), detail: problem };
}

function surfaceProblem(root: string, request: TrialRequest, steeringMarkers: readonly string[]): Declared {
  const { channel } = request.surface;
  if (channel === 'push') return pushProblem(root, request, steeringMarkers);
  if (channel === 'assess') return assessProblem(root, request, steeringMarkers);
  return channel === 'pull' ? pullProblem(root, request, steeringMarkers) : undefined;
}

/** Rung 1: the answer the surface's own command gives for the target, which for the assess surface is `mh assess`. */
function rung1Problem(root: string, request: TrialRequest, steeringMarkers: readonly string[]): string | undefined {
  if (request.surface.channel === 'assess') {
    const assessed = runNode(root, [`${root}/${MH_ENTRY}`, 'assess', request.targetPath], '');
    return checkAssessRung1(assessed.stdout, steeringMarkers, request.arm);
  }
  const query = runNode(root, [`${root}/${MH_ENTRY}`, 'query', request.targetPath], '');
  return checkRung1(query.stdout, steeringMarkers, request.arm);
}

function preflight(root: string, request: TrialRequest): Declared {
  const check = runNode(root, [`${root}/${MH_ENTRY}`, 'check'], '');
  if (check.status !== 0)
    return { kind: 'rung-1-failed', detail: 'the derived config does not pass `mh check` over the seeded state' };
  const steeringMarkers = request.steeringMarkers.map((entry) => entry.steeringMarker);
  const rung1 = rung1Problem(root, request, steeringMarkers);
  if (rung1 !== undefined) return { kind: 'rung-1-failed', detail: rung1 };
  return surfaceProblem(root, request, steeringMarkers);
}

function sweepProblem(root: string, request: TrialRequest): { problem: Declared; opened: number } {
  const files = readTextFiles(root, ['.git']);
  const verdicts = request.steeringMarkers.map((entry) =>
    sweepForSteeringMarker(files, entry.steeringMarker, entry.sweepExpectation),
  );
  const bad = verdicts.find((verdict) => !verdict.ok);
  return {
    problem: bad === undefined ? undefined : { kind: 'mint-refused', detail: `leak sweep: ${bad.reason}` },
    opened: files.length,
  };
}

function changedFiles(root: string): string[] {
  const status = runProcess({
    command: 'git',
    args: ['status', '--porcelain', '--untracked-files=all'],
    cwd: root,
    env: toolEnvironment(),
    timeoutMs: PREFLIGHT_MS,
  });
  return status.stdout
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.slice(3));
}

const EMPTY: TrialOutcome = {
  declared: undefined,
  root: undefined,
  mintedRootDigest: undefined,
  configDigest: undefined,
  skillScriptsDigest: undefined,
  mhDigest: undefined,
  raw: undefined,
  startedAtMs: 0,
  durationMs: 0,
  finalFile: undefined,
  changedFiles: [],
  sweepFilesOpened: 0,
};

interface SessionRun {
  readonly raw: NonNullable<TrialOutcome['raw']>;
  readonly startedAtMs: number;
  readonly durationMs: number;
}

/** A scratch home holding only the credential files, for a Host harness whose profile derived scratch-home isolation. */
function makeScratchHome(realHome: string): string {
  const scratch = `${systemTemporaryDirectory()}/mh-scratch-home-${randomHex(6)}`;
  makeDirectory(scratch);
  for (const copy of credentialCopies(realHome, scratch)) if (pathExists(copy.from)) copyFile(copy.from, copy.to);
  return scratch;
}

/** The session's report, run under a scratch home that is deleted afterwards whatever the session did. */
function runIn(root: string, request: TrialRequest, scratchHome: string | undefined): SessionRun {
  const profile = profileOf(request.host.name, request.host.probes);
  const driver = driverOf(request.host.name);
  const [command, ...prefix] = request.host.command;
  const argv = driver.argv({
    task: request.task,
    model: request.host.model,
    maxTurns: request.host.maxTurns,
    wallClockMs: request.host.wallClockMs,
    tools: toolsFor(request.surface.shell, request.host.tools),
    allowedTools: allowedToolsFor(request.surface.shell),
    scopedMode: profile.scopedMode,
  });
  const report = runProcess({
    command: command ?? '',
    args: [...prefix, ...argv],
    cwd: root,
    env: driver.environment(environment(), scratchHome),
    timeoutMs: request.host.wallClockMs,
  });
  const raw = {
    spawnError: report.spawnError,
    timedOut: report.timedOut,
    stderr: report.stderr,
    exitStatus: report.status,
    parsed: driver.parse(report.stdout),
  };
  return { raw, startedAtMs: report.startedAtMs, durationMs: report.durationMs };
}

function runSession(root: string, request: TrialRequest): SessionRun {
  if (profileOf(request.host.name, request.host.probes).isolation !== 'scratch-home')
    return runIn(root, request, undefined);
  const scratch = makeScratchHome(request.host.home);
  try {
    return runIn(root, request, scratch);
  } finally {
    removeTree(scratch);
  }
}

export function runTrial(request: TrialRequest): TrialOutcome {
  const minted = mintRoot({
    sources: request.sources,
    arm: request.arm,
    surface: request.surface,
    pullLine: request.pullLine,
    derivedConfig: request.derivedConfig,
    heldOut: request.heldOut,
    under: request.under,
  });
  if (!minted.ok) return { ...EMPTY, declared: { kind: 'mint-refused', detail: minted.refusals.join('; ') } };
  const { root } = minted;
  const swept = sweepProblem(root, request);
  const early = swept.problem ?? preflight(root, request);
  const base = {
    ...EMPTY,
    root,
    mintedRootDigest: minted.digest,
    configDigest: minted.configDigest,
    sweepFilesOpened: swept.opened,
    startedAtMs: nowMs(),
  };
  const outcome = early === undefined ? withSession(root, request, base) : { ...base, declared: early };
  if (request.keepRoot !== true) removeTree(root);
  return outcome;
}

/** The digest of the hook script a surface runs: the first script it ships, or `none` for a surface with no hook. */
function hookDigest(root: string, request: TrialRequest): string {
  const path = `${root}/${SKILL_SCRIPTS}/${hookScriptsFor(request.surface)[0] ?? ''}`;
  return hookScriptsFor(request.surface).length > 0 && pathExists(path) ? digestFile(path) : 'none';
}

function withSession(root: string, request: TrialRequest, base: TrialOutcome): TrialOutcome {
  const session = runSession(root, request);
  const target = `${root}/${request.targetPath}`;
  return {
    ...base,
    raw: session.raw,
    startedAtMs: session.startedAtMs,
    durationMs: session.durationMs,
    finalFile: pathExists(target) ? readText(target) : undefined,
    changedFiles: changedFiles(root),
    skillScriptsDigest: hookDigest(root, request),
    mhDigest: digestTree(`${root}/node_modules/@hancrafted/markdown-harness/dist`, []),
  };
}
