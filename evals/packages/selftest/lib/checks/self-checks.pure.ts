// The self-test's judgements, over what the stub logged and what the wrapper
// wrote. Each is a measurement of the instrument, not a test of the product.

import type { BreakRuns, Finding, MatrixExpectation, MatrixRun, StubInvocation } from './self-checks.types.ts';

export const CHECKS = {
  exit: 'every execution exits zero',
  nonces: 'cache off: every stub invocation has a distinct nonce',
  count: 'cache off: invocations equal the matrix size, times the executions',
  sessionIds: 'cache off: session identifiers are distinct across executions',
  overlap: 'concurrency one: no two stub invocations overlap',
  sharing: 'no sharing address in the eval tool output',
  broken: {
    ran: 'concurrency break: the eval tool ran four wide',
    serial:
      'concurrency break: no two stub invocations overlap, because the provider spawns synchronously (the overlap check cannot be turned red by this setting)',
    nonces:
      'cache break, cache on: every stub invocation still has a distinct nonce, because the tool does not cache a file:// provider',
    count: 'cache break, cache on: invocations still equal the matrix size, times the executions',
  },
} as const;

/** What the concurrency break asks the tool for, in place of one. */
const BROKEN_CONCURRENCY_MARK = 'concurrency: 4';

export function parseInvocationLog(text: string): StubInvocation[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as StubInvocation);
}

export function distinctNonces(invocations: readonly StubInvocation[]): boolean {
  return new Set(invocations.map((entry) => entry.nonce)).size === invocations.length;
}

/** Pairs of invocations whose intervals overlap: concurrency above one, whatever the configuration says. */
export function overlaps(invocations: readonly StubInvocation[]): number {
  const ordered = [...invocations].sort((left, right) => left.startedAt - right.startedAt);
  return ordered.slice(1).filter((entry, index) => entry.startedAt < (ordered[index]?.endedAt ?? 0)).length;
}

export function sharingHits(text: string, addresses: readonly string[]): string[] {
  return addresses.filter((address) => text.includes(address));
}

function finding(check: string, ok: boolean, detail: string): Finding {
  return { check, ok, detail };
}

function cacheFindings(runs: readonly MatrixRun[], expectation: MatrixExpectation): Finding[] {
  const all = runs.flatMap((run) => run.invocations);
  const ids = runs.flatMap((run) => run.sessionIds);
  const wanted = expectation.invocationsPerRun * expectation.runs;
  return [
    finding(CHECKS.nonces, distinctNonces(all), `${all.length} invocations`),
    finding(CHECKS.count, all.length === wanted, `${all.length} of ${wanted}`),
    finding(CHECKS.sessionIds, new Set(ids).size === ids.length, `${new Set(ids).size} of ${ids.length}`),
  ];
}

/**
 * The break pass. Two settings are turned the wrong way in turn, and each is judged for what it shows. Neither
 * goes red, and the findings say why: the eval tool never caches a file:// provider, so a cache that is on has
 * nothing to replay, and the provider spawns the Host harness synchronously, so four-wide concurrency still runs
 * one session at a time. A finding turns red the day either stops being true.
 */
export function judgeBreaks(breaks: BreakRuns, expectation: MatrixExpectation): Finding[] {
  const wide = breaks.concurrency;
  const cacheRuns = breaks.cacheOn;
  const all = cacheRuns.flatMap((run) => run.invocations);
  const wanted = expectation.invocationsPerRun * cacheRuns.length;
  return [
    finding(CHECKS.broken.ran, wide.toolText.includes(BROKEN_CONCURRENCY_MARK), BROKEN_CONCURRENCY_MARK),
    finding(CHECKS.broken.serial, overlaps(wide.invocations) === 0, `${overlaps(wide.invocations)} overlaps`),
    finding(CHECKS.broken.nonces, distinctNonces(all), `${all.length} invocations`),
    finding(CHECKS.broken.count, all.length === wanted, `${all.length} of ${wanted}`),
  ];
}

export function judgeMatrix(runs: readonly MatrixRun[], expectation: MatrixExpectation): Finding[] {
  const all = runs.flatMap((run) => run.invocations);
  const hits = runs.flatMap((run) => sharingHits(run.toolText, expectation.sharing));
  return [
    finding(
      CHECKS.exit,
      runs.every((run) => run.exitCode === 0),
      runs.map((run) => run.exitCode).join(','),
    ),
    ...cacheFindings(runs, expectation),
    finding(CHECKS.overlap, overlaps(all) === 0, `${overlaps(all)} overlaps`),
    finding(CHECKS.sharing, hits.length === 0, hits.join(',') || 'none'),
  ];
}
