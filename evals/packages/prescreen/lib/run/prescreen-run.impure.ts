// The pre-screen run: Host harness sessions with no tools and no hook, in an empty
// directory, answering the bare task. No arm, no minted root, no steering content: the
// session sees only what a Contributor would type. Exit contract as the wrapper's:
// zero when every expected session ran, one when the instrument could not, two on misuse.
//
// The exit derivation here (`screen/prescreen-outcome.pure.ts`) is deliberately not the wrapper's
// `deriveExit`. The wrapper's is private to its Package and reads tool result rows this run does not
// have; a root export would give this Package an edge to the wrapper's whole contract for one
// comparison of counts. Decision 22's key-and-endpoint sentence is likewise deferred to phase 5
// (ARCH-007 3.1): nothing here holds a key, and the child environment is the allow-list.

import {
  commandLineArguments,
  environment,
  exitWith,
  nowIso,
  randomHex,
  writeErr,
  writeOut,
} from '../../../platform/host-ambient.ts';
import {
  makeDirectory,
  pathExists,
  removeTree,
  systemTemporaryDirectory,
  writeText,
} from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import { classifySession } from '../../../session/classify-session.ts';
import { buildChildEnvironment, buildClaudeArgv } from '../../../session/host-invocation.ts';
import { parseSessionStream } from '../../../session/session-stream.ts';
import { screenOutcome } from '../screen/prescreen-outcome.pure.ts';
import { answerText, hostCommand } from '../screen/prescreen-parts.pure.ts';
import { PROMPTS, budgetRefusal, expectedSessions, parseScreenArgs, poolCandidates } from '../screen/prescreen.pure.ts';
import type { RunLocation, ScreenArgs, ScreenCell, ScreenSample } from '../screen/prescreen.types.ts';
import { CASE_FILE, corpusOf, promptTexts } from './prescreen-inputs.impure.ts';

const EXPECTATION = { apiKeySource: 'none', expectedPlugins: ['cc-plugin-agents-md', 'cc-plugin-telemetry'] };
const MISUSE = 2;

interface OneSession {
  readonly sample: ScreenSample | undefined;
  readonly failure: string | undefined;
}

function sessionFor(
  args: ScreenArgs,
  request: { cell: ScreenCell; task: string; command: readonly string[]; cwd: string },
): OneSession {
  const [command, ...prefix] = request.command;
  const argv = buildClaudeArgv({
    task: request.task,
    model: request.cell.model,
    maxTurns: 1,
    tools: [],
    allowedTools: [],
  });
  const report = runProcess({
    command: command ?? '',
    args: [...prefix, ...argv, ...(args.stubSay === undefined ? [] : ['--say', args.stubSay])],
    cwd: request.cwd,
    env: buildChildEnvironment(environment()),
    timeoutMs: 180_000,
  });
  const parsed = parseSessionStream(report.stdout);
  const verdict = classifySession(
    { spawnError: report.spawnError, timedOut: report.timedOut, stderr: report.stderr, parsed },
    EXPECTATION,
  );
  if (verdict.outcome === 'instrument-failure')
    return { sample: undefined, failure: `${verdict.kind}: ${verdict.detail}` };
  return { sample: { ...request.cell, text: answerText(parsed.events) }, failure: undefined };
}

interface Screening {
  readonly samples: ScreenSample[];
  readonly failures: string[];
}

function sampleAll(args: ScreenArgs, where: RunLocation): Screening {
  const texts = promptTexts(where.checkout);
  const cwd = `${systemTemporaryDirectory()}/prescreen-${randomHex(6)}`;
  makeDirectory(cwd);
  const screening: Screening = { samples: [], failures: [] };
  const command = hostCommand(args.host, args.stubMode, where);
  for (const model of args.models) {
    PROMPTS.forEach((prompt, index) => {
      for (let sample = 0; sample < args.samples; sample += 1) {
        const cell = { model, prompt };
        const session = sessionFor(args, { cell, task: texts[index] ?? '', command, cwd });
        if (session.sample !== undefined) screening.samples.push(session.sample);
        if (session.failure !== undefined) screening.failures.push(`${model}/${prompt}: ${session.failure}`);
      }
    });
  }
  removeTree(cwd);
  return screening;
}

function runScreen(args: ScreenArgs, checkout: string): number {
  const runDir = `${checkout}/evals/runs/prescreen-${nowIso().replace(/[:.]/g, '-')}-${randomHex(3)}`;
  makeDirectory(runDir);
  const seed = args.seed ?? randomHex(8);
  const candidates = args.candidates ?? poolCandidates({ seed, count: args.pool, corpus: corpusOf(checkout) });
  const { samples, failures } = sampleAll(args, { checkout, runDir });
  const expected = expectedSessions(args.models.length, args.samples);
  const outcome = screenOutcome({ runDir, seed, candidates, samples, failures, expected });
  writeText(`${runDir}/prescreen.json`, outcome.record);
  writeOut(outcome.report);
  return outcome.code;
}

function main(): number {
  const parsed = parseScreenArgs(commandLineArguments());
  const checkout = process.cwd();
  if (!parsed.ok) return fail(parsed.problem);
  if (!pathExists(`${checkout}/${CASE_FILE}`)) return fail('run this from the repository root');
  const refusal = budgetRefusal(
    expectedSessions(parsed.args.models.length, parsed.args.samples),
    parsed.args.allowOverBudget,
  );
  return refusal === undefined ? runScreen(parsed.args, checkout) : fail(refusal);
}

function fail(problem: string): number {
  writeErr(`misuse: ${problem}\n`);
  return MISUSE;
}

export function runPrescreen(): never {
  return exitWith(main());
}
