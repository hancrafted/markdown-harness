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
import type { CellTally, ScreenArgs, ScreenArgsResult, ScreenSample, Verdict } from './prescreen.types.ts';

export const MIN_SAMPLES = 20;
const SESSION_LIMIT = 40;
/** The two prompts R5 screens: the task alone, then the task plus the first half of the carrier. */
export const PROMPTS = ['task', 'task-plus-first-half'] as const;
const DEFAULT_MODELS = ['sonnet', 'haiku', 'opus'];
const DEFAULT_POOL = 6;
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

/** Whether a sampled answer says the word: any case, quoted or backticked, plain plural, never inside a longer word. */
export function mentions(text: string, word: string): boolean {
  return new RegExp(`(?<![a-z])${word}s?(?![a-z])`, 'i').test(text);
}

function cellOf(tallies: CellTally[], sample: ScreenSample): CellTally | undefined {
  return tallies.find((cell) => cell.model === sample.model && cell.prompt === sample.prompt);
}

export function tallyHits(samples: readonly ScreenSample[], candidates: readonly string[]): Map<string, CellTally[]> {
  const result = new Map<string, CellTally[]>(candidates.map((candidate) => [candidate, []]));
  for (const candidate of candidates) {
    const cells: CellTally[] = [];
    for (const sample of samples) {
      const hit = mentions(sample.text, candidate) ? 1 : 0;
      const cell = cellOf(cells, sample);
      if (cell === undefined) cells.push({ model: sample.model, prompt: sample.prompt, samples: 1, hits: hit });
      else cells.splice(cells.indexOf(cell), 1, { ...cell, samples: cell.samples + 1, hits: cell.hits + hit });
    }
    result.set(candidate, cells);
  }
  return result;
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
  '--stub-mode': (args, value) => ({ ...args, stubMode: value }),
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
  return { ok: true, args };
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
