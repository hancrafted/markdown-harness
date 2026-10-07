// The wrapper: the process that owns the exit code. Zero when every expected
// session ran and was graded, however badly; one when the instrument could not
// run; two on misuse. The eval tool's own exit code says nothing and is ignored.

import { commandLineArguments, exitWith, writeErr, writeOut } from '../../../platform/host-ambient.ts';
import { pathExists, writeText } from '../../../platform/host-files.ts';
import { budgetRefusal, parseRunArgs } from '../args/run-args.pure.ts';
import { describeKey } from '../canary/canary-keys.pure.ts';
import { MISUSE, deriveExit } from '../exit/exit-contract.pure.ts';
import { unpairedFields } from '../results/results-reading.pure.ts';
import { summarise } from '../summary/run-summary.pure.ts';
import { buildCurrentMh } from './run-build.impure.ts';
import { runCanaries } from './run-canary.impure.ts';
import { planRun } from './run-plan.impure.ts';
import type { RunPlan } from './run-plan.types.ts';
import { readResults, runTool } from './run-tool.impure.ts';

function unlike(rows: Parameters<typeof unpairedFields>[0]): string[] {
  const fields = unpairedFields(rows);
  return fields.length === 0 ? [] : [`cohort-field-differs: rows of one run disagree on ${fields.join(', ')}`];
}

function finishWith(plan: RunPlan, canaryFailure: string | undefined, toolFailure: string | undefined): number {
  const results = readResults(plan);
  const failure = [
    canaryFailure,
    toolFailure,
    ...results.duplicates.map((id) => `duplicate-session-id: ${id}`),
    ...unlike(results.rows),
  ].find((part) => part !== undefined);
  const rows = results.rows.map((row) => ({ graded: row.summary.graded, failureKind: row.summary.failureKind }));
  const verdict = deriveExit({
    rows: canaryFailure === undefined ? rows : undefined,
    expected: plan.expected,
    toolCount: results.toolCount,
    wrapperFailure: failure,
  });
  const lines = summarise({
    sessions: results.rows.map((row) => row.summary),
    expected: plan.expected,
    trialsPerCell: plan.args.trials,
    canaryFailure,
    canaries: plan.canaryKeys.map(describeKey),
  });
  writeOut(
    `${[...lines, ...verdict.reasons.map((reason) => `exit ${verdict.code}: ${reason}`), `run ${plan.runId}, seed recorded in ${plan.runDir}`].join('\n')}\n`,
  );
  return verdict.code;
}

function main(): number {
  const parsed = parseRunArgs(commandLineArguments());
  if (!parsed.ok) return fail(parsed.problem);
  const checkout = process.cwd();
  if (!pathExists(`${checkout}/evals/promptfooconfig.yaml`)) return fail('run this from the repository root');
  const plan = planRun(parsed.args, checkout);
  const refusal = budgetRefusal(plan.expected, parsed.args.allowOverBudget);
  if (refusal !== undefined) return fail(refusal);
  const built = buildCurrentMh(checkout);
  if (built !== undefined) return finishWith(plan, built, undefined);
  writeText(`${plan.runDir}/plan.json`, `${JSON.stringify(plan, null, 2)}\n`);
  const canary = runCanaries(plan);
  if (canary !== undefined) return finishWith(plan, canary, undefined);
  const tool = runTool(plan);
  writeText(`${plan.runDir}/promptfoo.log`, tool.output);
  return finishWith(
    plan,
    undefined,
    tool.spawnError === undefined ? undefined : `eval tool could not start (${tool.spawnError})`,
  );
}

function fail(problem: string): number {
  writeErr(`misuse: ${problem}\n`);
  return MISUSE;
}

export function runWrapper(): never {
  return exitWith(main());
}
