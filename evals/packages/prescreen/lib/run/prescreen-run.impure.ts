// The pre-screen run: Host harness sessions with no tools and no hook, in an empty
// directory, answering the bare task. No arm, no minted root, no steering content: the
// session sees only what a Contributor would type. Exit contract as the wrapper's:
// zero when every expected session ran, one when the instrument could not, two on misuse.

import { parse as parseYaml } from 'yaml';
import { deriveArm, testedCarrierAddress } from '../../../arms/derive-arms.ts';
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
  readText,
  readTextFiles,
  removeTree,
  systemTemporaryDirectory,
  writeText,
} from '../../../platform/host-files.ts';
import { runProcess } from '../../../platform/host-process.ts';
import { classifySession } from '../../../session/classify-session.ts';
import { buildChildEnvironment, buildClaudeArgv } from '../../../session/host-invocation.ts';
import { parseSessionStream } from '../../../session/session-stream.ts';
import {
  MIN_SAMPLES,
  PROMPTS,
  admissionVerdicts,
  budgetRefusal,
  expectedSessions,
  parseScreenArgs,
  poolCandidates,
  reportLines,
  tallyHits,
} from '../screen/prescreen.pure.ts';
import type { ScreenArgs, ScreenSample } from '../screen/prescreen.types.ts';

const CASE_FILE = 'evals/suites/steering/cases/research-note.yaml';
const CORPUS_SKIP = ['node_modules', 'dist', '.git', '.worktrees', '.claude', '.scratch', 'runs'];
const EXPECTATION = { apiKeySource: 'none', expectedPlugins: ['cc-plugin-agents-md', 'cc-plugin-telemetry'] };
const MISUSE = 2;

interface CaseRow {
  readonly vars: {
    readonly task: string;
    readonly seedDir: string;
    readonly carriers: readonly { readonly placeholder: string }[];
  };
}

function firstHalfOf(checkout: string, vars: CaseRow['vars']): string {
  const configText = readText(`${checkout}/${vars.seedDir}/markdown-harness.config.yaml`);
  const placeholder = vars.carriers[0]?.placeholder ?? '';
  const address = testedCarrierAddress(configText, placeholder);
  const derived = deriveArm({ configText, arm: 'steered', substitutes: [{ placeholder, clause: '' }] });
  return derived.carriers.find((entry) => entry.address === address)?.text.trim() ?? '';
}

/** The case's task, then the task with the carrier's plausible first half, the steering clause left out. */
function promptTexts(checkout: string): string[] {
  const [row] = parseYaml(readText(`${checkout}/${CASE_FILE}`)) as CaseRow[];
  if (row === undefined) return [];
  const guidance = `The repository's guidance for this section: ${firstHalfOf(checkout, row.vars)}`;
  return [row.vars.task, `${row.vars.task}\n\n${guidance}`];
}

function sampleText(parsedEvents: ReturnType<typeof parseSessionStream>): string {
  const spoken = parsedEvents.events.flatMap((event) =>
    event.kind === 'assistant-text' || event.kind === 'result' ? [event.text] : [],
  );
  return spoken.join('\n');
}

interface OneSession {
  readonly sample: ScreenSample | undefined;
  readonly failure: string | undefined;
}

function sessionFor(
  args: ScreenArgs,
  request: { model: string; prompt: string; task: string; command: readonly string[]; cwd: string },
): OneSession {
  const [command, ...prefix] = request.command;
  const argv = buildClaudeArgv({ task: request.task, model: request.model, maxTurns: 1, tools: [], allowedTools: [] });
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
  return { sample: { model: request.model, prompt: request.prompt, text: sampleText(parsed) }, failure: undefined };
}

function hostCommand(args: ScreenArgs, checkout: string, runDir: string): string[] {
  return args.host === 'stub'
    ? [
        'node',
        `${checkout}/evals/self-test/stub-host.mjs`,
        '--mode',
        args.stubMode,
        '--log',
        `${runDir}/stub-sessions.log`,
      ]
    : ['claude'];
}

function corpusOf(checkout: string): string {
  return readTextFiles(checkout, CORPUS_SKIP)
    .map((file) => file.text)
    .join('\n');
}

interface Screening {
  readonly samples: ScreenSample[];
  readonly failures: string[];
}

function sampleAll(args: ScreenArgs, where: { checkout: string; runDir: string }): Screening {
  const texts = promptTexts(where.checkout);
  const cwd = `${systemTemporaryDirectory()}/prescreen-${randomHex(6)}`;
  makeDirectory(cwd);
  const found: Screening = { samples: [], failures: [] };
  const command = hostCommand(args, where.checkout, where.runDir);
  for (const model of args.models) {
    PROMPTS.forEach((prompt, index) => {
      for (let sample = 0; sample < args.samples; sample += 1) {
        const one = sessionFor(args, { model, prompt, task: texts[index] ?? '', command, cwd });
        if (one.sample !== undefined) found.samples.push(one.sample);
        if (one.failure !== undefined) found.failures.push(`${model}/${prompt}: ${one.failure}`);
      }
    });
  }
  removeTree(cwd);
  return found;
}

function runScreen(args: ScreenArgs, checkout: string): number {
  const runDir = `${checkout}/evals/runs/prescreen-${nowIso().replace(/[:.]/g, '-')}-${randomHex(3)}`;
  makeDirectory(runDir);
  const seed = args.seed ?? randomHex(8);
  const candidates = args.candidates ?? poolCandidates({ seed, count: args.pool, corpus: corpusOf(checkout) });
  const { samples, failures } = sampleAll(args, { checkout, runDir });
  const expected = expectedSessions(args.models.length, args.samples);
  return finish({ runDir, seed, candidates, samples, failures, expected });
}

interface Outcome {
  readonly runDir: string;
  readonly seed: string;
  readonly candidates: readonly string[];
  readonly samples: readonly ScreenSample[];
  readonly failures: readonly string[];
  readonly expected: number;
}

function finish(outcome: Outcome): number {
  const verdicts = admissionVerdicts(tallyHits(outcome.samples, outcome.candidates), MIN_SAMPLES);
  const short =
    outcome.samples.length === outcome.expected
      ? []
      : [`${outcome.samples.length} answers read, expected ${outcome.expected}`];
  const broken = [...short, ...outcome.failures.slice(0, 5)];
  writeText(
    `${outcome.runDir}/prescreen.json`,
    `${JSON.stringify({ seed: outcome.seed, verdicts, failures: outcome.failures }, null, 2)}\n`,
  );
  const lines = [
    ...reportLines(verdicts, outcome.samples.length),
    ...broken.map((reason) => `instrument failure: ${reason}`),
    `seed ${outcome.seed}, recorded in ${outcome.runDir}`,
  ];
  writeOut(`${lines.join('\n')}\n`);
  return broken.length === 0 ? 0 : 1;
}

function main(): number {
  const parsed = parseScreenArgs(commandLineArguments());
  const checkout = process.cwd();
  const problem = !parsed.ok
    ? parsed.problem
    : !pathExists(`${checkout}/${CASE_FILE}`)
      ? 'run this from the repository root'
      : undefined;
  if (!parsed.ok || problem !== undefined) return fail(problem ?? '');
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
