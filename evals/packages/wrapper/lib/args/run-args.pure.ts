// Argument parsing and the session budget. A mistyped argument is misuse (exit 2),
// never a score and never an instrument failure. A matrix above forty sessions is
// refused unless told otherwise, because the subscription's rate limit is shared
// with the Operator's own work.

import type { WrapperHost } from '../../../session/host-profile.ts';
import { HOST_NAMES, MATRIX_NAMES, profileOf } from '../../../session/host-profile.ts';
import type { ArgsResult, RunArgs } from './run-args.types.ts';

export const DEFAULT_TRIALS = 8;
export const SESSION_LIMIT = 40;
const WRAPPER_HOSTS: readonly WrapperHost[] = HOST_NAMES.map((name) => profileOf(name, {}).wrapperName);
const FLAGS = [
  '--host',
  '--matrix',
  '--trials',
  '--seed',
  '--stub-mode',
  '--host-binary',
  '--allow-over-budget',
  '--break',
  '--probe-record',
  '--wall-clock-seconds',
];

const DEFAULTS: RunArgs = {
  host: 'claude',
  matrix: 'push',
  trials: DEFAULT_TRIALS,
  seed: undefined,
  allowOverBudget: false,
  stubMode: 'obey',
  hostBinary: undefined,
  break: 'none',
  probeRecord: undefined,
  wallClockSeconds: undefined,
};

function integer(value: string): number | undefined {
  return /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

function hostValue(args: RunArgs, value: string): RunArgs | string {
  const host = WRAPPER_HOSTS.find((name) => name === value);
  if (host !== undefined) return { ...args, host };
  if (value === 'stub') return { ...args, host: value };
  return `--host is ${[...WRAPPER_HOSTS, 'stub'].join(', ')}, not ${value}`;
}

function matrixValue(args: RunArgs, value: string): RunArgs | string {
  const matrix = MATRIX_NAMES.find((name) => name === value);
  return matrix === undefined ? `--matrix is ${MATRIX_NAMES.join(', ')}, not ${value}` : { ...args, matrix };
}

function secondsValue(args: RunArgs, value: string): RunArgs | string {
  const seconds = integer(value);
  return seconds === undefined
    ? `--wall-clock-seconds needs a positive integer, not ${value}`
    : { ...args, wallClockSeconds: seconds };
}

function trialsValue(args: RunArgs, value: string): RunArgs | string {
  const trials = integer(value);
  return trials === undefined ? `--trials needs a positive integer, not ${value}` : { ...args, trials };
}

function breakValue(args: RunArgs, value: string): RunArgs | string {
  if (value !== 'concurrency' && value !== 'cache') return `--break is concurrency or cache, not ${value}`;
  return args.host === 'stub' ? { ...args, break: value } : '--break needs --host stub before it';
}

const SETTERS: Readonly<Record<string, (args: RunArgs, value: string) => RunArgs | string>> = {
  '--host': hostValue,
  '--matrix': matrixValue,
  '--trials': trialsValue,
  '--break': breakValue,
  '--wall-clock-seconds': secondsValue,
  '--seed': (args, value) => ({ ...args, seed: value }),
  '--probe-record': (args, value) => ({ ...args, probeRecord: value }),
  '--host-binary': (args, value) => ({ ...args, hostBinary: value }),
  '--stub-mode': (args, value) => ({ ...args, stubMode: value }),
};

function applyValue(args: RunArgs, flag: string, value: string): RunArgs | string {
  return (SETTERS[flag] ?? (() => `unknown argument ${flag}`))(args, value);
}

function apply(args: RunArgs, flag: string, value: string | undefined): RunArgs | string {
  if (flag === '--allow-over-budget') return { ...args, allowOverBudget: true };
  return value === undefined ? `${flag} needs a value` : applyValue(args, flag, value);
}

export function parseRunArgs(argv: readonly string[]): ArgsResult {
  let args = DEFAULTS;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index] ?? '';
    if (!FLAGS.includes(flag)) return { ok: false, problem: `unknown argument ${flag}` };
    const takesValue = flag !== '--allow-over-budget';
    const next = apply(args, flag, argv[index + 1]);
    if (typeof next === 'string') return { ok: false, problem: next };
    args = next;
    if (takesValue) index += 1;
  }
  return { ok: true, args };
}

/** The committed configuration file a matrix is run from, relative to `evals/`. */
export function configFileFor(matrix: RunArgs['matrix']): string {
  return matrix === 'push' ? 'promptfooconfig.yaml' : `promptfooconfig.${matrix}.yaml`;
}

/** A refusal sentence when the matrix is above the limit and the Operator did not say otherwise. */
export function budgetRefusal(sessions: number, allow: boolean): string | undefined {
  if (allow || sessions <= SESSION_LIMIT) return undefined;
  return `${sessions} sessions is above the ${SESSION_LIMIT} limit; pass --allow-over-budget to run it`;
}
