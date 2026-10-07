// Running an eval script as the self-test does, and the two checks every scenario is judged by.

import { environment, nodeExecutable } from '../../../platform/host-ambient.ts';
import { runProcess } from '../../../platform/host-process.ts';
import type { Finding } from '../checks/self-checks.types.ts';
import type { Execution } from './execution.types.ts';

const WRAPPER = 'evals/packages/wrapper/run-evals.ts';
export const TRIALS = 2;

/** Runs one eval script under node with a bare PATH and HOME environment, and reads its exit code and run directory. */
export function runEvalScript(script: string, extra: readonly string[]): Execution {
  const env = { PATH: environment().PATH ?? '', HOME: environment().HOME ?? '' };
  const report = runProcess({
    command: nodeExecutable(),
    args: [script, ...extra],
    cwd: process.cwd(),
    env,
    timeoutMs: 20 * 60_000,
  });
  const runLine = /^run \S+, seed recorded in (.+)$/m.exec(report.stdout);
  return { exitCode: report.status ?? -1, stdout: `${report.stdout}${report.stderr}`, runDir: runLine?.[1] };
}

export function runWrapper(extra: readonly string[]): Execution {
  return runEvalScript(WRAPPER, extra);
}

export function expectExit(check: string, execution: Execution, wanted: number): Finding {
  return { check, ok: execution.exitCode === wanted, detail: `exit ${execution.exitCode}, wanted ${wanted}` };
}

export function expectOutput(check: string, execution: Execution, pattern: RegExp): Finding {
  return { check, ok: pattern.test(execution.stdout), detail: String(pattern) };
}

export function matrixArgs(matrix: string, seed: string, extra: readonly string[] = []): string[] {
  return ['--host', 'stub', '--matrix', matrix, '--trials', String(TRIALS), '--seed', seed, ...extra];
}
