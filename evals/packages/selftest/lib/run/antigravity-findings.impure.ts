// Phase 4 of the self-test tier: the Antigravity provider, end to end through the real pinned eval tool against
// the stand-in's `agy` mode. The streams are hand-written from R3, so this proves the wiring and the failure
// classification, and says nothing about whether live `agy` still prints this shape. No account is touched: the
// stand-in is a script, and the live path is refused while the probes are unprobed.

import { pathExists, readTextFiles } from '../../../platform/host-files.ts';
import type { Finding } from '../checks/self-checks.types.ts';
import { expectExit, expectOutput, matrixArgs, runWrapper } from './execution.impure.ts';
import type { Execution } from './execution.types.ts';

/** The stand-in's Antigravity matrix under the real tool, under a seed and any extra arguments. */
const runAgy = (seed: string, extra: readonly string[] = []): Execution => runWrapper(matrixArgs('agy', seed, extra));

export function cohortRowsOf(dir: string | undefined): Record<string, unknown>[] {
  const sessions = dir !== undefined && pathExists(`${dir}/sessions`) ? readTextFiles(`${dir}/sessions`, []) : [];
  return sessions.flatMap((file) => {
    const row = (JSON.parse(file.text) as { cohortRow?: Record<string, unknown> }).cohortRow;
    return row === undefined ? [] : [row];
  });
}

const WANTED_ROW = {
  hostName: 'antigravity',
  isolation: 'none',
  turnCap: 'none',
  resolvedModel: 'gemini-3.8-flash-low',
  modelFamily: 'gemini',
  hostVersion: 'unknown',
};

function differences(row: Record<string, unknown>): string[] {
  const wrong = Object.entries(WANTED_ROW).filter(([field, wanted]) => row[field] !== wanted);
  return wrong.map(([field]) => `${field} ${String(row[field])}`);
}

/** What every Antigravity cohort row must say that a Claude Code row need not: the leaked surface and the only bound. */
function agyRowProblems(rows: readonly Record<string, unknown>[]): string[] {
  if (rows.length === 0) return ['no cohort row was written'];
  return rows.flatMap((row) => [
    ...differences(row),
    ...(typeof row.wallClockMs === 'number' ? [] : ['wallClockMs missing']),
    ...(String(row.leakedSurface).includes('user-hooks') ? [] : ['leakedSurface does not name user-hooks']),
  ]);
}

function rowFinding(rowsDir: string | undefined): Finding {
  const problems = agyRowProblems(cohortRowsOf(rowsDir));
  return {
    check: 'antigravity: every cohort row records the leaked surface, no turn cap, the wall-clock bound and the model',
    ok: problems.length === 0,
    detail: problems.join('; ') || 'rows complete',
  };
}

function failureFindings(): Finding[] {
  const auth = runAgy('self-v', ['--stub-mode', 'auth-fail']);
  const denied = runAgy('self-w', ['--stub-mode', 'denied']);
  const dead = runAgy('self-x', ['--stub-mode', 'ignore']);
  return [
    expectExit('an Antigravity sign-in wall at exit 0 is an instrument failure, exit one', auth, 1),
    expectOutput('antigravity: the sign-in wall is named an authentication failure', auth, /authentication-failure/),
    expectExit('an Antigravity auto-denied write at exit 0 is an instrument failure, exit one', denied, 1),
    expectOutput('antigravity: the denied write is named a permission denial', denied, /permission-denied/),
    expectExit('an Antigravity pull command that never runs fails the pull canary, exit one', dead, 1),
  ];
}

function refusalFindings(): Finding[] {
  const live = runWrapper(['--host', 'agy', '--matrix', 'agy', '--trials', '1']);
  const wrongHost = runWrapper(['--matrix', 'agy']);
  const short = runAgy('self-s5', ['--wall-clock-seconds', '5']);
  return [
    expectExit('a live Antigravity run is refused while its probes are unprobed, exit two', live, 2),
    expectOutput('antigravity: the refusal names the probes still to run', live, /unprobed capabilities: hook-fires/),
    expectExit('the Antigravity matrix under the real Claude Code is misuse, exit two', wrongHost, 2),
    expectExit('an Antigravity wall clock under the minimum is misuse, exit two', short, 2),
    expectOutput('antigravity: the refusal names the minimum wall clock', short, /minimum is 10s/),
  ];
}

export function antigravityFindings(): Finding[] {
  const agy = runAgy('self-u');
  return [
    expectExit('the Antigravity matrix runs end to end through the real tool and exits zero', agy, 0),
    expectOutput(
      'antigravity: the steered cell follows the pull command',
      agy,
      /antigravity-pull-json-steered: 2\/2 steering marker hits/,
    ),
    rowFinding(agy.runDir),
    ...failureFindings(),
    ...refusalFindings(),
  ];
}
