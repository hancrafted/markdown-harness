// The probe tool: runs one minimal `agy` session for one probe, reads the outcome from the stream, and writes the
// answer to the probe record the profile reads. Ambient reads: the arguments, the environment (PATH and HOME for the
// child, and the binary override), the clock for the recorded instant, the filesystem and one child process. It
// never reads `~/.gemini`: the only account files it touches are the two the consent notice lists, and only after
// `--consent-credential-copy`, into a scratch home it deletes. Exit 0 an answer was recorded, 1 the session could
// not answer so nothing was recorded, 2 misuse or a refusal.

import {
  commandLineArguments,
  environment,
  exitWith,
  nowIso,
  writeErr,
  writeOut,
} from '../../../platform/host-ambient.ts';
import { pathExists, readText, removeTree, writeText } from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import type { RawSession } from '../../../session/classify-session.ts';
import { driverOf } from '../../../session/host-driver.ts';
import type { ProbeRecord } from '../../../session/host-profile.ts';
import { profileOf, resolveBinary } from '../../../session/host-profile.ts';
import { PROBE_RECORD_PATH, parseProbeRecord, serialiseProbeRecord, withProbe } from '../../../session/probe-record.ts';
import { consentNotice, credentialCopies } from '../../../session/scratch-home.ts';
import { parseProbeArgs } from '../args/probe-args.pure.ts';
import type { ProbeArgs } from '../args/probe-args.types.ts';
import { probeRefusal } from '../gate/probe-gate.pure.ts';
import { CANDIDATE_MODE, NOTE_PATH, SENTINEL, probeTask } from '../task/probe-task.pure.ts';
import { verdictOf } from '../verdict/probe-verdict.pure.ts';
import type { ProbeEvidence } from '../verdict/probe-verdict.types.ts';
import { fillScratchHome, makeWorkspace, scratchHomePath } from './probe-workspace.impure.ts';

const MISUSE = 2;
const INCONCLUSIVE = 1;
const PROBE_WALL_CLOCK_MS = 120_000;

function readRecord(path: string): ProbeRecord | string {
  if (!pathExists(path)) return {};
  const parsed = parseProbeRecord(readText(path));
  return typeof parsed === 'string' ? `${path}: ${parsed}` : parsed;
}

/** The command that starts the session: the stand-in, or the real binary by bare name, never a shell alias. */
function commandOf(args: ProbeArgs, checkout: string, record: ProbeRecord): string[] {
  if (args.stub)
    return ['node', `${checkout}/evals/self-test/stub-host.mjs`, '--mode', args.stubMode, '--stub-host', 'agy'];
  return [resolveBinary(profileOf('antigravity', record), args.hostBinary, environment())];
}

/** Everything one probe session is started from. */
interface Start {
  readonly args: ProbeArgs;
  readonly checkout: string;
  readonly record: ProbeRecord;
}

interface Session {
  readonly workspace: string;
  readonly scratchHome: string | undefined;
  readonly copied: number;
}

function spawnSession(start: Start, session: Session, scopedMode: string | undefined): RawSession {
  const { args, checkout, record } = start;
  const driver = driverOf('antigravity');
  const [command, ...prefix] = commandOf(args, checkout, record);
  const argv = driver.argv({
    task: probeTask(args.probe),
    model: args.model ?? profileOf('antigravity', record).canaryModel,
    maxTurns: 1,
    wallClockMs: PROBE_WALL_CLOCK_MS,
    tools: [],
    allowedTools: [],
    scopedMode,
  });
  const report = runProcess({
    command: command ?? '',
    args: [...prefix, ...argv],
    cwd: session.workspace,
    env: driver.environment(environment(), session.scratchHome),
    timeoutMs: PROBE_WALL_CLOCK_MS,
  });
  return {
    spawnError: report.spawnError,
    timedOut: report.timedOut,
    stderr: report.stderr,
    exitStatus: report.status,
    parsed: driver.parse(report.stdout),
  };
}

function sessionEvidence(start: Start, session: Session): ProbeEvidence {
  const scopedMode = start.args.probe === 'scoped-permission-mode' ? CANDIDATE_MODE : undefined;
  return {
    raw: spawnSession(start, session, scopedMode),
    sentinel: pathExists(`${session.workspace}/.agents/${SENTINEL}`),
    written: pathExists(`${session.workspace}/${NOTE_PATH}`),
    credentialFilesCopied: session.copied,
    mode: scopedMode,
  };
}

function notice(args: ProbeArgs): string {
  const source = args.home ?? environment().HOME ?? '';
  const scratch = scratchHomePath();
  return consentNotice(credentialCopies(source, scratch), scratch);
}

function runSession(start: Start): ProbeEvidence {
  const { args } = start;
  const workspace = makeWorkspace(args.probe);
  const scratchHome = args.probe === 'scratch-home-credentials' ? scratchHomePath() : undefined;
  try {
    const copied = scratchHome === undefined ? 0 : fillScratchHome(args.home ?? environment().HOME ?? '', scratchHome);
    return sessionEvidence(start, { workspace, scratchHome, copied });
  } finally {
    removeTree(workspace);
    if (scratchHome !== undefined) removeTree(scratchHome);
  }
}

function report(start: Start, recordPath: string, evidence: ProbeEvidence): number {
  const { args, record } = start;
  const verdict = verdictOf(args.probe, evidence);
  if (verdict.kind === 'inconclusive') {
    writeOut(`inconclusive: ${args.probe}: ${verdict.reason}; nothing was recorded\n`);
    return INCONCLUSIVE;
  }
  const result = { ...verdict.result, recordedAt: nowIso() };
  writeText(recordPath, serialiseProbeRecord(withProbe(record, args.probe, result)));
  writeOut(`recorded: ${args.probe} ${result.status}: ${result.detail}\nrecord: ${recordPath}\n`);
  return 0;
}

function main(): number {
  const parsed = parseProbeArgs(commandLineArguments());
  if (!parsed.ok) return refuse(parsed.problem);
  const { args } = parsed;
  const checkout = process.cwd();
  const recordPath = args.record ?? `${checkout}/${PROBE_RECORD_PATH}`;
  const record = readRecord(recordPath);
  if (typeof record === 'string') return refuse(record);
  const refusal = probeRefusal({ args, consentNotice: notice(args) }, record);
  if (refusal !== undefined) return refuse(refusal);
  if (args.probe === 'scratch-home-credentials') writeOut(`${notice(args)}\nConsent given.\n`);
  const start = { args, checkout, record };
  return report(start, recordPath, runSession(start));
}

function refuse(problem: string): number {
  writeErr(`${problem}\n`);
  return MISUSE;
}

export function runAgyProbe(): never {
  return exitWith(main());
}
