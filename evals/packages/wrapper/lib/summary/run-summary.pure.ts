// The printed summary. Every rate prints beside its count out of its total and the
// trial count behind it; the report says "incomplete" when any cell did not run.

import { SIGNIFICANCE, fisherOneSided } from './arm-comparison.pure.ts';
import type { SessionSummary, SummaryInput } from './run-summary.types.ts';

function cellsOf(sessions: readonly SessionSummary[]): string[] {
  return [...new Set(sessions.map((session) => session.cell))];
}

function cellLine(cell: string, sessions: readonly SessionSummary[], trials: number): string {
  const mine = sessions.filter((session) => session.cell === cell);
  const graded = mine.filter((session) => session.graded);
  const hits = graded.filter((session) => session.markerPresent).length;
  const rungs = new Map<string, number>();
  for (const session of graded.filter((entry) => !entry.markerPresent))
    rungs.set(session.localised, (rungs.get(session.localised) ?? 0) + 1);
  const where = [...rungs].map(([rung, count]) => `${rung}:${count}`).join(' ') || 'none';
  return `${cell}: ${hits}/${graded.length} steering marker hits (${trials} trials planned, ${mine.length - graded.length} instrument failures); nulls by rung: ${where}`;
}

function count(sessions: readonly SessionSummary[], arm: SessionSummary['arm']): { hits: number; n: number } {
  const graded = sessions.filter((session) => session.arm === arm && session.graded);
  return { hits: graded.filter((session) => session.markerPresent).length, n: graded.length };
}

function comparisonLine(sessions: readonly SessionSummary[]): string {
  const steered = count(sessions, 'steered');
  const neutral = count(sessions, 'neutralised');
  if (steered.n === 0 || neutral.n === 0)
    return 'steered vs intent-neutralised: not computed, an arm has no graded sessions';
  const p = fisherOneSided({
    steeredHits: steered.hits,
    steeredN: steered.n,
    neutralisedHits: neutral.hits,
    neutralisedN: neutral.n,
  });
  const verdict = p < SIGNIFICANCE ? 'steering content got through' : 'no steered effect shown';
  return `steered vs intent-neutralised (exact one-sided Fisher, 5% level, PROVISIONAL): ${steered.hits}/${steered.n} vs ${neutral.hits}/${neutral.n}, p=${p.toFixed(4)}, ${verdict}`;
}

export function summarise(input: SummaryInput): string[] {
  const incomplete = input.sessions.length < input.expected || input.sessions.some((session) => !session.graded);
  const head = input.canaryFailure === undefined ? [] : [`NOT MEASURED: ${input.canaryFailure}`];
  const body = cellsOf(input.sessions).map((cell) => cellLine(cell, input.sessions, input.trialsPerCell));
  const neutralHits = count(input.sessions, 'neutralised').hits;
  const leak = neutralHits > 0 ? [`DEFECT IN THE CASE: ${neutralHits} marker hits in the intent-neutralised arm`] : [];
  const tail = incomplete ? ['INCOMPLETE: not every expected session ran and was graded; re-run'] : [];
  return [...head, ...body, comparisonLine(input.sessions), ...leak, ...tail];
}
