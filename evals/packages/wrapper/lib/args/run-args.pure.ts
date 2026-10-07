// Argument parsing and the session budget. A mistyped argument is misuse (exit 2),
// never a score and never an instrument failure. A matrix above forty sessions is
// refused unless told otherwise, because the subscription's rate limit is shared
// with the Operator's own work.

import type { ArgsResult, RunArgs } from './run-args.types.ts';

export const DEFAULT_TRIALS = 8;
export const SESSION_LIMIT = 40;
const FLAGS = ['--host', '--trials', '--seed', '--stub-mode', '--host-binary', '--allow-over-budget'];

const DEFAULTS: RunArgs = {
  host: 'claude',
  trials: DEFAULT_TRIALS,
  seed: undefined,
  allowOverBudget: false,
  stubMode: 'obey',
  hostBinary: undefined,
};

function integer(value: string): number | undefined {
  return /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

function hostValue(args: RunArgs, value: string): RunArgs | string {
  return value === 'claude' || value === 'stub' ? { ...args, host: value } : `--host is claude or stub, not ${value}`;
}

function trialsValue(args: RunArgs, value: string): RunArgs | string {
  const trials = integer(value);
  return trials === undefined ? `--trials needs a positive integer, not ${value}` : { ...args, trials };
}

function applyValue(args: RunArgs, flag: string, value: string): RunArgs | string {
  if (flag === '--host') return hostValue(args, value);
  if (flag === '--trials') return trialsValue(args, value);
  if (flag === '--seed') return { ...args, seed: value };
  return flag === '--host-binary' ? { ...args, hostBinary: value } : { ...args, stubMode: value };
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

/** A refusal sentence when the matrix is above the limit and the Operator did not say otherwise. */
export function budgetRefusal(sessions: number, allow: boolean): string | undefined {
  if (allow || sessions <= SESSION_LIMIT) return undefined;
  return `${sessions} sessions is above the ${SESSION_LIMIT} limit; pass --allow-over-budget to run it`;
}
