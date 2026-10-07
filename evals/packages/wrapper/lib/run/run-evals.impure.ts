// The wrapper: the process that owns the exit code. Zero when every expected
// session ran and was graded, however badly; one when the instrument could not
// run; two on misuse. The eval tool's own exit code says nothing and is ignored.

import { commandLineArguments, exitWith, writeErr, writeOut } from '../../../platform/host-ambient.ts';
import { pathExists, writeText } from '../../../platform/host-files.ts';
import type { ProbeRecord } from '../../../session/host-profile.ts';
import { hostRefusal } from '../args/host-gate.pure.ts';
import { budgetRefusal, parseRunArgs } from '../args/run-args.pure.ts';
import type { RunArgs } from '../args/run-args.types.ts';
import { describeKey, unprovableKeys } from '../canary/canary-keys.pure.ts';
import { MISUSE, deriveExit } from '../exit/exit-contract.pure.ts';
import { unpairedFields } from '../results/results-reading.pure.ts';
import { summarise } from '../summary/run-summary.pure.ts';
import { readProbeRecord } from './probe-record-read.impure.ts';
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

/** A sentence refusing the run before anything is built or spawned, or undefined when it may start. */
function refusalOf(args: RunArgs, checkout: string, record: ProbeRecord): string | undefined {
  if (!pathExists(`${checkout}/evals/promptfooconfig.yaml`)) return 'run this from the repository root';
  return hostRefusal(args, record);
}

function planRefusal(plan: RunPlan): string | undefined {
  return (
    plan.cellRefusals[0] ??
    unprovableKeys(plan.canaryKeys, plan.host.probes)[0] ??
    budgetRefusal(plan.expected, plan.args.allowOverBudget)
  );
}

/** Parse, read the probe record, plan, and refuse: the plan, or the misuse sentence that stops the run. */
function prepare(checkout: string): RunPlan | string {
  const parsed = parseRunArgs(commandLineArguments());
  if (!parsed.ok) return parsed.problem;
  const record = readProbeRecord(parsed.args, checkout);
  if (typeof record === 'string') return record;
  const early = refusalOf(parsed.args, checkout, record);
  if (early !== undefined) return early;
  const plan = planRun(parsed.args, checkout, record);
  return planRefusal(plan) ?? plan;
}

function execute(plan: RunPlan): number {
  const built = buildCurrentMh(plan.checkout);
  if (built !== undefined) return finishWith(plan, built, undefined);
  writeText(`${plan.runDir}/plan.json`, `${JSON.stringify(plan, null, 2)}\n`);
  const canary = runCanaries(plan);
  if (canary !== undefined) return finishWith(plan, canary, undefined);
  const tool = runTool(plan);
  writeText(`${plan.runDir}/promptfoo.log`, tool.output);
  const spawnFailure = tool.spawnError === undefined ? undefined : `eval tool could not start (${tool.spawnError})`;
  return finishWith(plan, undefined, spawnFailure);
}

function main(): number {
  const prepared = prepare(process.cwd());
  return typeof prepared === 'string' ? fail(prepared) : execute(prepared);
}

function fail(problem: string): number {
  writeErr(`misuse: ${problem}\n`);
  return MISUSE;
}

export function runWrapper(): never {
  return exitWith(main());
}
