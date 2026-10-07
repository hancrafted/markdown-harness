// The self-test tier: the real pinned eval tool, through the wrapper, against the
// hand-written stub Host harness. No model, no key; the network is needed to fetch
// the pinned tool. It is run by hand and is a measurement of the instrument, not a
// test of the product. Each scenario breaks something and expects the wrapper to say so.

import { environment, exitWith, nodeExecutable, writeOut } from '../../../platform/host-ambient.ts';
import { pathExists, readText, readTextFiles } from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import { judgeMatrix, parseInvocationLog } from '../checks/self-checks.pure.ts';
import type { Finding, MatrixRun } from '../checks/self-checks.types.ts';

const WRAPPER = 'evals/packages/wrapper/run-evals.ts';
const SHARING = ['promptfoo.app', 'api.promptfoo', 'share.promptfoo'];
const TRIALS = 2;
const CELLS = 3;

interface Execution {
  readonly exitCode: number;
  readonly stdout: string;
  readonly runDir: string | undefined;
}

function wrapper(extra: readonly string[]): Execution {
  const env = { PATH: environment().PATH ?? '', HOME: environment().HOME ?? '' };
  const report = runProcess({
    command: nodeExecutable(),
    args: [WRAPPER, ...extra],
    cwd: process.cwd(),
    env,
    timeoutMs: 20 * 60_000,
  });
  const runLine = /^run \S+, seed recorded in (.+)$/m.exec(report.stdout);
  return { exitCode: report.status ?? -1, stdout: `${report.stdout}${report.stderr}`, runDir: runLine?.[1] };
}

function textOf(dir: string | undefined, name: string): string {
  return dir !== undefined && pathExists(`${dir}/${name}`) ? readText(`${dir}/${name}`) : '';
}

function sessionIdsOf(dir: string | undefined): string[] {
  const sessions = dir !== undefined && pathExists(`${dir}/sessions`) ? readTextFiles(`${dir}/sessions`, []) : [];
  return sessions.map((file) => (JSON.parse(file.text) as { sessionId?: string }).sessionId ?? file.path);
}

function matrixRun(execution: Execution): MatrixRun {
  const dir = execution.runDir;
  const toolText = `${textOf(dir, 'promptfoo.log')}\n${textOf(dir, 'results.json')}\n${execution.stdout}`;
  return {
    exitCode: execution.exitCode,
    invocations: parseInvocationLog(textOf(dir, 'stub-sessions.log')),
    sessionIds: sessionIdsOf(dir),
    toolText,
  };
}

function expectExit(check: string, execution: Execution, wanted: number): Finding {
  return { check, ok: execution.exitCode === wanted, detail: `exit ${execution.exitCode}, wanted ${wanted}` };
}

function trialsArgs(seed: string, extra: readonly string[] = []): string[] {
  return ['--host', 'stub', '--trials', String(TRIALS), '--seed', seed, ...extra];
}

function matrixFindings(): Finding[] {
  const twice = [wrapper(trialsArgs('self-a')), wrapper(trialsArgs('self-b'))];
  return judgeMatrix(twice.map(matrixRun), {
    invocationsPerRun: CELLS * TRIALS + 1,
    runs: twice.length,
    sharing: SHARING,
  });
}

function scenarios(): Finding[] {
  const deaf = wrapper(trialsArgs('self-c', ['--stub-mode', 'deaf']));
  const auth = wrapper(['--host', 'stub', '--trials', '1', '--stub-mode', 'auth-fail']);
  const missing = wrapper(['--host', 'claude', '--host-binary', '/nonexistent/claude', '--trials', '1']);
  return [
    ...matrixFindings(),
    expectExit('a graded failure exits zero, whatever the eval tool status (rung 4 nulls)', deaf, 0),
    {
      check: 'a graded null is localised to a rung in the summary',
      ok: /nulls by rung: 4:/.test(deaf.stdout),
      detail: 'rung 4 expected',
    },
    expectExit('an authentication failure is an instrument failure, exit one', auth, 1),
    expectExit('a missing Host harness binary is an instrument failure, exit one', missing, 1),
    expectExit('a mistyped argument is misuse, exit two', wrapper(['--trails', '1']), 2),
  ];
}

export function runSelfTest(): never {
  const findings = scenarios();
  const lines = findings.map((finding) => `${finding.ok ? 'PASS' : 'FAIL'}  ${finding.check} (${finding.detail})`);
  const failed = findings.filter((finding) => !finding.ok).length;
  writeOut(`${lines.join('\n')}\n${failed === 0 ? 'self-test green' : `self-test RED: ${failed} failed`}\n`);
  return exitWith(failed === 0 ? 0 : 1);
}
