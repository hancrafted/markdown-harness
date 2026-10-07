// The pooled word-family pre-screen's pure parts. A coined word is a candidate for
// a steering marker only if a Host harness session given the bare task, with no tools
// and no hook, never says it. Twenty samples per model per prompt kind, zero hits.
//
// Pooling: a candidate's prior does not depend on the other candidates, so one sampled
// answer is scanned against every candidate in the pool. A pool of six costs the same
// sessions as one candidate and each candidate still sees every sample. Twenty clean
// samples bound the unprompted rate at about 15 percent (rule of three): enough to reject
// a leaky word, never to certify one. The neutralised arm bounds the rest.

import { drawCoinedWord } from '../../../arms/steering-markers.ts';
import type {
  CellTally,
  ScreenArgs,
  ScreenArgsResult,
  ScreenCell,
  ScreenSample,
  StubMode,
  Verdict,
} from './prescreen.types.ts';

export const MIN_SAMPLES = 20;
const SESSION_LIMIT = 40;
/** The two prompts R5 screens: the task alone, then the task plus the first half of the carrier. */
export const PROMPTS = ['task', 'task-plus-first-half'] as const;
const DEFAULT_MODELS = ['sonnet', 'haiku', 'opus'];
const DEFAULT_POOL = 6;
const STUB_MODES: readonly StubMode[] = ['obey', 'deaf', 'ignore', 'partial', 'shell', 'auth-fail', 'slow'];
const FLAGS = [
  '--host',
  '--models',
  '--samples',
  '--pool',
  '--seed',
  '--candidates',
  '--allow-over-budget',
  '--stub-say',
  '--stub-mode',
];

export function poolCandidates(request: { seed: string; count: number; corpus: string }): string[] {
  const pool: string[] = [];
  for (let index = 0; pool.length < request.count; index += 1) {
    const word = drawCoinedWord({
      seed: request.seed,
      caseId: 'prescreen',
      address: `candidate-${index}`,
      corpus: request.corpus,
    });
    if (!pool.includes(word)) pool.push(word);
  }
  return pool;
}

/** Edits between two words, counting a substitution, an insertion and a deletion as one each. */
function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) previous = nextRow(previous, [row, left[row - 1] ?? ''], right);
  return previous[right.length] ?? 0;
}

function nextRow(previous: readonly number[], [row, letter]: readonly [number, string], right: string): number[] {
  const current = [row];
  for (let column = 1; column <= right.length; column += 1) {
    const substitution = (previous[column - 1] ?? 0) + (letter === right[column - 1] ? 0 : 1);
    current.push(Math.min(substitution, (previous[column] ?? 0) + 1, (current[column - 1] ?? 0) + 1));
  }
  return current;
}

/**
 * Whether a sampled answer says the word or a near copy of it: any case, quoted or backticked, a plain
 * plural, and any word token one edit away (R5: a coined word is fragile unless the regex tolerates one
 * edit, because a model may "correct" it toward a real neighbour). Tokens are runs of letters, so a
 * longer word that merely contains the candidate is a different token and does not match.
 */
export function mentions(text: string, word: string): boolean {
  const target = word.toLowerCase();
  const tokens = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return tokens.some(
    (token) =>
      editDistance(token, target) <= 1 || (token.endsWith('s') && editDistance(token.slice(0, -1), target) <= 1),
  );
}

function cellKey(cell: ScreenCell): string {
  return `${cell.model}/${cell.prompt}`;
}

function tallyOne(samples: readonly ScreenSample[], candidate: string): CellTally[] {
  const cells = new Map<string, CellTally>();
  for (const sample of samples) {
    const cell = cells.get(cellKey(sample)) ?? { model: sample.model, prompt: sample.prompt, samples: 0, hits: 0 };
    cells.set(cellKey(sample), {
      ...cell,
      samples: cell.samples + 1,
      hits: cell.hits + (mentions(sample.text, candidate) ? 1 : 0),
    });
  }
  return [...cells.values()];
}

export function tallyHits(samples: readonly ScreenSample[], candidates: readonly string[]): Map<string, CellTally[]> {
  return new Map(candidates.map((candidate) => [candidate, tallyOne(samples, candidate)]));
}

function reasonsFor(cells: readonly CellTally[], required: number): string[] {
  const empty = cells.length === 0 ? ['scanned in no cell'] : [];
  const hits = cells.filter((cell) => cell.hits > 0).map((cell) => `${cell.hits} hit in ${cell.model}/${cell.prompt}`);
  const short = cells
    .filter((cell) => cell.samples < required)
    .map((cell) => `only ${cell.samples} samples in ${cell.model}/${cell.prompt}, ${required} required`);
  return [...empty, ...hits, ...short];
}

export function admissionVerdicts(tallies: ReadonlyMap<string, readonly CellTally[]>, required: number): Verdict[] {
  return [...tallies].map(([candidate, cells]) => {
    const reasons = reasonsFor(cells, required);
    return { candidate, admitted: reasons.length === 0, reasons };
  });
}

export function expectedSessions(models: number, samples: number): number {
  return models * PROMPTS.length * samples;
}

export function budgetRefusal(sessions: number, allow: boolean): string | undefined {
  if (allow || sessions <= SESSION_LIMIT) return undefined;
  return `${sessions} sessions is above the ${SESSION_LIMIT} limit; pass --allow-over-budget to run it`;
}

const DEFAULTS: ScreenArgs = {
  host: 'claude',
  models: DEFAULT_MODELS,
  samples: MIN_SAMPLES,
  pool: DEFAULT_POOL,
  seed: undefined,
  candidates: undefined,
  allowOverBudget: false,
  stubSay: undefined,
  stubMode: 'obey',
};

function count(value: string, floor: number, name: string): number | string {
  const parsed = /^[1-9]\d*$/.test(value) ? Number(value) : 0;
  return parsed >= floor ? parsed : `${name} needs an integer of at least ${floor}, not ${value}`;
}

function listOf(value: string): string[] {
  return value.split(',').filter((part) => part !== '');
}

function isStubMode(value: string): value is StubMode {
  return (STUB_MODES as readonly string[]).includes(value);
}

type Setter = (args: ScreenArgs, value: string) => ScreenArgs | string;

function atLeast(name: string, floor: number, set: (args: ScreenArgs, count: number) => ScreenArgs): Setter {
  return (args, value) => {
    const parsed = count(value, floor, name);
    return typeof parsed === 'string' ? parsed : set(args, parsed);
  };
}

const SETTERS: Readonly<Record<string, Setter>> = {
  '--host': (args, value) =>
    value === 'claude' || value === 'stub' ? { ...args, host: value } : `--host is claude or stub, not ${value}`,
  '--samples': atLeast('--samples', MIN_SAMPLES, (args, samples) => ({ ...args, samples })),
  '--pool': atLeast('--pool', 1, (args, pool) => ({ ...args, pool })),
  '--models': (args, value) => ({ ...args, models: listOf(value) }),
  '--candidates': (args, value) => ({ ...args, candidates: listOf(value) }),
  '--seed': (args, value) => ({ ...args, seed: value }),
  '--stub-mode': (args, value) =>
    isStubMode(value) ? { ...args, stubMode: value } : `--stub-mode is one of ${STUB_MODES.join(', ')}, not ${value}`,
  '--stub-say': (args, value) => ({ ...args, stubSay: value }),
};

function applyValue(args: ScreenArgs, flag: string, value: string): ScreenArgs | string {
  return SETTERS[flag]?.(args, value) ?? `unknown argument ${flag}`;
}

export function parseScreenArgs(argv: readonly string[]): ScreenArgsResult {
  let args = DEFAULTS;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index] ?? '';
    if (!FLAGS.includes(flag)) return { ok: false, problem: `unknown argument ${flag}` };
    if (flag === '--allow-over-budget') {
      args = { ...args, allowOverBudget: true };
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined) return { ok: false, problem: `${flag} needs a value` };
    const next = applyValue(args, flag, value);
    if (typeof next === 'string') return { ok: false, problem: next };
    args = next;
    index += 1;
  }
  return finished(argv, args);
}

function finished(argv: readonly string[], args: ScreenArgs): ScreenArgsResult {
  const stray = strayStubFlag(argv, args);
  return stray === undefined ? { ok: true, args } : { ok: false, problem: stray };
}

/** The seams the self-test drives are not for a live run: a stub flag is refused unless `--host stub` is given, wherever it stands. */
function strayStubFlag(argv: readonly string[], args: ScreenArgs): string | undefined {
  if (args.host === 'stub') return undefined;
  const flag = argv.find((part) => part === '--stub-say' || part === '--stub-mode');
  return flag === undefined ? undefined : `${flag} is a self-test seam and needs --host stub`;
}

/** The report lines: per candidate, admitted or refused with the cells that refused it. */
export function reportLines(verdicts: readonly Verdict[], sessions: number): string[] {
  const admitted = verdicts.filter((verdict) => verdict.admitted).length;
  const rows = verdicts.map((verdict) =>
    verdict.admitted
      ? `${verdict.candidate}: admitted (zero hits in every cell)`
      : `${verdict.candidate}: REFUSED (${verdict.reasons.join('; ')})`,
  );
  return [
    `pre-screen: ${sessions} sessions, ${admitted} of ${verdicts.length} candidates admitted`,
    ...rows,
    'admission bounds the unprompted rate near 15 percent per cell; it rejects a leaky word and certifies nothing',
  ];
}
