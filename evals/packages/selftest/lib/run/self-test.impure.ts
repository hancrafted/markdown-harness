// The self-test tier: the real pinned eval tool, through the wrapper, against the
// hand-written stub Host harness. No model, no key; the network is needed to fetch
// the pinned tool. It is run by hand and is a measurement of the instrument, not a
// test of the product. Each scenario breaks something and expects the wrapper to say so.

import { parse } from 'yaml';
import { environment, exitWith, nodeExecutable, writeOut } from '../../../platform/host-ambient.ts';
import { pathExists, readText, readTextFiles } from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import { judgeBreaks, judgeMatrix, parseInvocationLog } from '../checks/self-checks.pure.ts';
import type { Finding, MatrixRun } from '../checks/self-checks.types.ts';

const WRAPPER = 'evals/packages/wrapper/run-evals.ts';
const SHARING = ['promptfoo.app', 'api.promptfoo', 'share.promptfoo'];
const TRIALS = 2;
const MATRIX_CONFIG = 'evals/promptfooconfig.yaml';

/** How many cells the matrix configuration holds, counted by evaluating it, so adding a cell moves the expectation. */
function cellsInMatrix(): number {
  const providers = (parse(readText(MATRIX_CONFIG)) as { providers?: unknown }).providers;
  return Array.isArray(providers) ? providers.length : 0;
}

/** Sessions one run of the matrix invokes: every cell for every trial, plus the one canary the push matrix owes. */
function invocationsPerRun(): number {
  return cellsInMatrix() * TRIALS + 1;
}

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
    invocationsPerRun: invocationsPerRun(),
    runs: twice.length,
    sharing: SHARING,
  });
}

function breakFindings(): Finding[] {
  const concurrency = wrapper(trialsArgs('self-d', ['--break', 'concurrency']));
  const cacheOn = [
    wrapper(trialsArgs('self-e', ['--break', 'cache'])),
    wrapper(trialsArgs('self-e', ['--break', 'cache'])),
  ];
  return judgeBreaks(
    { concurrency: matrixRun(concurrency), cacheOn: cacheOn.map(matrixRun) },
    { invocationsPerRun: invocationsPerRun(), runs: cacheOn.length, sharing: SHARING },
  );
}

function expectOutput(check: string, execution: Execution, pattern: RegExp): Finding {
  return { check, ok: pattern.test(execution.stdout), detail: String(pattern) };
}

function matrixArgs(matrix: string, seed: string, extra: readonly string[] = []): string[] {
  return ['--host', 'stub', '--matrix', matrix, '--trials', String(TRIALS), '--seed', seed, ...extra];
}

function pullFindings(): Finding[] {
  const pull = wrapper(matrixArgs('pull', 'self-p'));
  return [
    expectExit('the pull matrix runs end to end and exits zero', pull, 0),
    expectOutput(
      'pull: the steered encodings follow the pull command',
      pull,
      /pull-json-steered: 2\/2 steering marker hits/,
    ),
    expectOutput('pull: the encoding contrast (rung 6) is printed', pull, /encoding contrast, pull \(rung 6/),
  ];
}

function carrierFindings(): Finding[] {
  const carriers = wrapper(matrixArgs('carriers', 'self-q', ['--stub-mode', 'partial']));
  return [
    expectExit('a partial profile over two carriers is graded, exit zero', carriers, 0),
    expectOutput(
      'carriers: a steered null that followed one carrier of two localises to rung 9',
      carriers,
      /pull-json-steered: 0\/2 .*nulls by rung: 9:2/,
    ),
    expectOutput(
      'carriers: the carrier that decays is named',
      carriers,
      /carrier profile \(rung 9\): .*\d\/2; .*\d\/2/,
    ),
  ];
}

function shellFindings(): Finding[] {
  const shell = wrapper(matrixArgs('push', 'self-r', ['--stub-mode', 'shell']));
  return [
    expectExit('shell-created files are graded, exit zero', shell, 0),
    expectOutput(
      'shell: the coverage hole is counted in the widened-shell cell',
      shell,
      /push-shell-steered: created through the shell in 2\/2 sessions/,
    ),
    expectOutput(
      'shell: a Bash-created file with no hook delivery localises to rung 3',
      shell,
      /push-shell-steered: 0\/2 .*nulls by rung: 3:2/,
    ),
  ];
}

function pullCanaryFindings(): Finding[] {
  const deadPull = wrapper(matrixArgs('pull', 'self-s', ['--stub-mode', 'ignore']));
  return [
    expectExit('a pull command that never runs fails the pull canary, an instrument failure, exit one', deadPull, 1),
    expectOutput(
      'the pull canary failure is named as not measured',
      deadPull,
      /NOT MEASURED: canary failed: the pull command never ran/,
    ),
  ];
}

/** Phase 2: the pull cells, the encoding contrast, the two-carrier profile, the shell hole, and the pull canary. */
function surfaceFindings(): Finding[] {
  return [...pullFindings(), ...carrierFindings(), ...shellFindings(), ...pullCanaryFindings()];
}

function scenarios(): Finding[] {
  const deaf = wrapper(trialsArgs('self-c', ['--stub-mode', 'deaf']));
  const auth = wrapper(['--host', 'stub', '--trials', '1', '--stub-mode', 'auth-fail']);
  const missing = wrapper(['--host', 'claude', '--host-binary', '/nonexistent/claude', '--trials', '1']);
  return [
    ...matrixFindings(),
    ...breakFindings(),
    ...surfaceFindings(),
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
