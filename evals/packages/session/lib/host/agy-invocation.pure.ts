// The Antigravity (`agy`) argv and child-environment builders, from R3's measured working command on `agy`
// 1.3.0. The flag set was not re-run here: no live `agy` call is made by this code path until the probes in
// host-profile.pure.ts are recorded.
//
// `agy` has no isolation flag and no turn cap. `--dangerously-skip-permissions` is the one headless write mode
// measured working; without a permission flag the first write is auto-denied and the process exits 0 having done
// nothing. When the scoped permission probe recorded a `--mode` that lets a write through, that mode is passed
// instead and nothing is skipped. `--print-timeout` is the only bound on a session, so it is always passed, below
// the process's wall clock, which is why a wall clock under MIN_WALL_CLOCK_MS is refused.
// The environment is an allow-list that keeps the real HOME, because the OAuth token is read from there, unless
// the scratch home probe recorded that a copied token stays authenticated and a scratch HOME is given. Gateway and
// ADC authentication variables never reach the child.

import type { AgyArgvInput } from './host-invocation.types.ts';

/** Seconds `agy` is told to stop before the process's own wall clock kills it. */
const KILL_MARGIN_SECONDS = 5;

/**
 * The shortest wall-clock bound a session may have. The print timeout is whole seconds, never under one, so a bound
 * of six seconds or less leaves it no room under the process bound; ten leaves the full margin and a few seconds of use.
 */
export const MIN_WALL_CLOCK_MS = 10_000;

export const AGY_ALLOWED_ENVIRONMENT: readonly string[] = ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR'];

/** A sentence refusing a wall-clock bound too short to keep the print timeout below it, or undefined when it is fine. */
export function wallClockRefusal(wallClockMs: number): string | undefined {
  if (wallClockMs >= MIN_WALL_CLOCK_MS) return undefined;
  return `a wall clock of ${wallClockMs / 1000}s leaves the print timeout no margin; the minimum is ${MIN_WALL_CLOCK_MS / 1000}s`;
}

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
    ...(input.scopedMode === undefined ? ['--dangerously-skip-permissions'] : ['--mode', input.scopedMode]),
    '--print-timeout',
    `${printTimeoutSeconds(input.wallClockMs)}s`,
  ];
}

export function buildAgyEnvironment(
  parent: Readonly<Record<string, string | undefined>>,
  scratchHome: string | undefined,
): Record<string, string> {
  const allowed = AGY_ALLOWED_ENVIRONMENT.flatMap((name) => {
    const value = name === 'HOME' && scratchHome !== undefined ? scratchHome : parent[name];
    return value === undefined ? [] : [[name, value] as const];
  });
  return Object.fromEntries(allowed);
}
