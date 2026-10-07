// The evals/ platform gate, process half: spawning a child with an explicit
// environment and standard input closed. The gate in src/ may never do this.

import { spawnSync } from 'node:child_process';
import type { RunReport, RunRequest } from './host-process.types.ts';

const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

export function runProcess(request: RunRequest): RunReport {
  const startedAtMs = Date.now();
  const run = spawnSync(request.command, [...request.args], {
    cwd: request.cwd,
    env: { ...request.env },
    encoding: 'utf8',
    input: request.input ?? '',
    timeout: request.timeoutMs,
    maxBuffer: MAX_OUTPUT_BYTES,
  });
  const code = (run.error as NodeJS.ErrnoException | undefined)?.code;
  return {
    status: run.status,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    spawnError: code === 'ETIMEDOUT' ? undefined : code,
    timedOut: code === 'ETIMEDOUT',
    startedAtMs,
    durationMs: Date.now() - startedAtMs,
  };
}
