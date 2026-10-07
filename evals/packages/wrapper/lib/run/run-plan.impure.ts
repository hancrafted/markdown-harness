// Planning a run: where it writes, how many sessions the configuration says it
// must hold, which Host harness it drives, and which revision of the wrapper.

import { parse } from 'yaml';
import { environment, nowIso, randomHex } from '../../../platform/host-ambient.ts';
import { readText } from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import type { ProbeRecord } from '../../../session/host-profile.ts';
import { hostNameOfMatrix, profileOf, resolveBinary } from '../../../session/host-profile.ts';
import { configFileFor } from '../args/run-args.pure.ts';
import type { RunArgs } from '../args/run-args.types.ts';
import { stubCommand } from '../args/stub-command.pure.ts';
import { canaryKeysFor, readCellKinds } from '../canary/canary-keys.pure.ts';
import type { CellKinds } from '../canary/canary-keys.types.ts';
import { expectedSessions } from '../exit/exit-contract.pure.ts';
import type { RunPlan } from './run-plan.types.ts';

const TOOLS = ['Read', 'Write', 'Edit'];

function listLength(path: string, key?: string): number {
  const document = parse(readText(path)) as unknown;
  const list = key === undefined ? document : (document as Record<string, unknown>)[key];
  return Array.isArray(list) ? list.length : 0;
}

function cellKinds(path: string): CellKinds {
  const document = parse(readText(path)) as { providers?: { config?: Record<string, unknown> }[] };
  return readCellKinds((document.providers ?? []).map((provider) => provider.config ?? {}));
}

/** The case file a configuration's `tests` names, relative to `evals/`. */
function casesFileOf(configPath: string): string {
  const tests = (parse(readText(configPath)) as { tests?: string }).tests ?? '';
  return tests.replace(/^file:\/\//, '');
}

function seedLayouts(path: string): string[] {
  const cases = parse(readText(path)) as { vars?: { seedDir?: string } }[];
  return [...new Set(cases.flatMap((entry) => (entry.vars?.seedDir === undefined ? [] : [entry.vars.seedDir])))];
}

function git(checkout: string, args: readonly string[]): string {
  const env = { PATH: environment().PATH ?? '' };
  return runProcess({ command: 'git', args, cwd: checkout, env, timeoutMs: 30_000 }).stdout.trim();
}

// A stand-in run is given no home, so a scratch home built for it never copies the account's credential files.
const DEFAULT_WALL_CLOCK_MS = 600_000;
const STUB_WALL_CLOCK_MS = 60_000;

function hostFor(args: RunArgs, record: ProbeRecord, where: { checkout: string; runDir: string }): RunPlan['host'] {
  const profile = profileOf(hostNameOfMatrix(args.matrix), record);
  const command =
    args.host === 'stub'
      ? stubCommand({ ...where, matrix: args.matrix, stubMode: args.stubMode })
      : [resolveBinary(profile, args.hostBinary, environment())];
  const defaultMs = args.host === 'stub' ? STUB_WALL_CLOCK_MS : DEFAULT_WALL_CLOCK_MS;
  const wallClockMs = args.wallClockSeconds === undefined ? defaultMs : args.wallClockSeconds * 1000;
  return {
    command,
    maxTurns: 6,
    wallClockMs,
    tools: TOOLS,
    probes: record,
    home: args.host === 'stub' ? '' : (environment().HOME ?? ''),
  };
}

export function planRun(args: RunArgs, checkout: string, record: ProbeRecord): RunPlan {
  const runId = `${nowIso().replace(/[:.]/g, '-')}-${randomHex(3)}`;
  const runDir = `${checkout}/evals/runs/${runId}`;
  const configPath = `${checkout}/evals/${configFileFor(args.matrix)}`;
  const casesPath = `${checkout}/evals/${casesFileOf(configPath)}`;
  const cells = listLength(configPath, 'providers');
  const cases = listLength(casesPath);
  const kinds = cellKinds(configPath);
  return {
    args,
    checkout,
    runId,
    runDir,
    cells,
    cases,
    seed: args.seed ?? randomHex(8),
    expected: expectedSessions({ cells, trials: args.trials, cases }),
    canaryKeys: canaryKeysFor(kinds.kinds, seedLayouts(casesPath)),
    cellRefusals: kinds.refusals,
    host: hostFor(args, record, { checkout, runDir }),
    revision: git(checkout, ['rev-parse', 'HEAD']) || 'unknown',
    dirty: String(git(checkout, ['status', '--porcelain']) !== ''),
  };
}
