// Planning a run: where it writes, how many sessions the configuration says it
// must hold, which Host harness it drives, and which revision of the wrapper.

import { parse } from 'yaml';
import { environment, nowIso, randomHex } from '../../../platform/host-ambient.ts';
import { readText } from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import type { RunArgs } from '../args/run-args.types.ts';
import { expectedSessions } from '../exit/exit-contract.pure.ts';
import type { RunPlan } from './run-plan.types.ts';

const TOOLS = ['Read', 'Write', 'Edit'];

function listLength(path: string, key?: string): number {
  const document = parse(readText(path)) as unknown;
  const list = key === undefined ? document : (document as Record<string, unknown>)[key];
  return Array.isArray(list) ? list.length : 0;
}

function git(checkout: string, args: readonly string[]): string {
  const env = { PATH: environment().PATH ?? '' };
  return runProcess({ command: 'git', args, cwd: checkout, env, timeoutMs: 30_000 }).stdout.trim();
}

function hostFor(args: RunArgs, where: { checkout: string; runDir: string }): RunPlan['host'] {
  const { checkout, runDir } = where;
  const binary = args.hostBinary;
  const stub = [
    'node',
    `${checkout}/evals/self-test/stub-host.mjs`,
    '--mode',
    args.stubMode,
    '--log',
    `${runDir}/stub-sessions.log`,
  ];
  const command = args.host === 'stub' ? stub : [binary ?? 'claude'];
  return { command, maxTurns: 6, wallClockMs: args.host === 'stub' ? 60_000 : 600_000, tools: TOOLS };
}

export function planRun(args: RunArgs, checkout: string): RunPlan {
  const runId = `${nowIso().replace(/[:.]/g, '-')}-${randomHex(3)}`;
  const runDir = `${checkout}/evals/runs/${runId}`;
  const cells = listLength(`${checkout}/evals/promptfooconfig.yaml`, 'providers');
  const cases = listLength(`${checkout}/evals/suites/steering/cases/research-note.yaml`);
  return {
    args,
    checkout,
    runId,
    runDir,
    cells,
    cases,
    seed: args.seed ?? randomHex(8),
    expected: expectedSessions({ cells, trials: args.trials, cases }),
    host: hostFor(args, { checkout, runDir }),
    revision: git(checkout, ['rev-parse', 'HEAD']) || 'unknown',
    dirty: String(git(checkout, ['status', '--porcelain']) !== ''),
  };
}
