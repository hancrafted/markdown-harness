// The Antigravity (`agy`) argv and child-environment builders, from R3's measured working command on `agy`
// 1.3.0. The flag set was not re-run here: no live `agy` call is made by this code path until the probes in
// host-profile.pure.ts are recorded.
//
// `agy` has no isolation flag and no turn cap. `--dangerously-skip-permissions` is the one headless write mode
// measured working; without it the first write is auto-denied and the process exits 0 having done nothing.
// `--print-timeout` is the only bound on a session, so it is always passed, below the process's wall clock.
// The environment is an allow-list that keeps the real HOME, because the OAuth token is read from there; a
// scratch HOME is an unprobed capability. Gateway and ADC authentication variables never reach the child.

import type { AgyArgvInput } from './host-invocation.types.ts';

/** Seconds `agy` is told to stop before the process's own wall clock kills it. */
const KILL_MARGIN_SECONDS = 5;

export const AGY_ALLOWED_ENVIRONMENT: readonly string[] = ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR'];

/** The print timeout for a wall-clock bound, never zero, because zero means `agy` waits for the turn to complete. */
export function printTimeoutSeconds(wallClockMs: number): number {
  return Math.max(1, Math.floor(wallClockMs / 1000) - KILL_MARGIN_SECONDS);
}

export function buildAgyArgv(input: AgyArgvInput): string[] {
  return [
    '-p',
    input.task,
    '--output-format',
    'stream-json',
    '--model',
    input.model,
    '--dangerously-skip-permissions',
    '--print-timeout',
    `${printTimeoutSeconds(input.wallClockMs)}s`,
  ];
}

export function buildAgyEnvironment(parent: Readonly<Record<string, string | undefined>>): Record<string, string> {
  const allowed = AGY_ALLOWED_ENVIRONMENT.flatMap((name) => {
    const value = parent[name];
    return value === undefined ? [] : [[name, value] as const];
  });
  return Object.fromEntries(allowed);
}
