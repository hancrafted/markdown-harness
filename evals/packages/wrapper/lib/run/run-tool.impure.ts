// Running the eval tool and reading back what it and the provider wrote. The
// tool's exit status is deliberately not returned: it is 100 for a failed
// assertion and says nothing about whether the instrument ran.

import { environment } from '../../../platform/host-ambient.ts';
import { makeDirectory, pathExists, readText, readTextFiles } from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import { configFileFor } from '../args/run-args.pure.ts';
import { duplicateSessionIds, parseSidecar, toolSessionCount } from '../results/results-reading.pure.ts';
import { PROMPTFOO_VERSION, toolArgv, toolEnvironment } from '../tool/eval-tool.pure.ts';
import type { RunPlan, RunResults, ToolRun } from './run-plan.types.ts';

/** What a self-test concurrency break asks the tool for, in place of one. */
const BROKEN_CONCURRENCY = 4;
const TOOL_WALL_CLOCK_MS = 4 * 60 * 60 * 1000;

function providerEnvironment(plan: RunPlan): Record<string, string> {
  return {
    EVALS_CHECKOUT: plan.checkout,
    EVALS_RUN_ID: plan.runId,
    EVALS_RUN_DIR: plan.runDir,
    EVALS_SEED: plan.seed,
    EVALS_TOOL_VERSION: PROMPTFOO_VERSION,
    EVALS_WRAPPER_REVISION: plan.revision,
    EVALS_WRAPPER_DIRTY: plan.dirty,
    EVALS_HOST: JSON.stringify(plan.host),
  };
}

export function runTool(plan: RunPlan): ToolRun {
  makeDirectory(`${plan.runDir}/promptfoo-state`);
  const argv = toolArgv({
    configPath: configFileFor(plan.args.matrix),
    trials: plan.args.trials,
    resultsPath: `${plan.runDir}/results.json`,
    concurrency: plan.args.break === 'concurrency' ? BROKEN_CONCURRENCY : 1,
    cache: plan.args.break === 'cache',
  });
  const env = {
    ...toolEnvironment(environment(), `${plan.runDir}/promptfoo-state`, plan.args.break === 'cache'),
    ...providerEnvironment(plan),
  };
  const report = runProcess({
    command: 'npx',
    args: argv,
    cwd: `${plan.checkout}/evals`,
    env,
    timeoutMs: TOOL_WALL_CLOCK_MS,
  });
  return { output: `${report.stdout}\n${report.stderr}`, spawnError: report.spawnError };
}

export function readResults(plan: RunPlan): RunResults {
  const dir = `${plan.runDir}/sessions`;
  const files = pathExists(dir) ? readTextFiles(dir, []) : [];
  const rows = files.flatMap((file) => {
    const row = parseSidecar(file.text);
    return row === undefined ? [] : [row];
  });
  const resultsPath = `${plan.runDir}/results.json`;
  return {
    rows,
    duplicates: duplicateSessionIds(rows),
    toolCount: pathExists(resultsPath) ? toolSessionCount(readText(resultsPath)) : undefined,
  };
}
