// The printed summary. Every rate prints beside its count out of its total and the
// trial count behind it; the report says "incomplete" when any cell did not run.

import { SIGNIFICANCE, fisherOneSided } from './arm-comparison.pure.ts';
import type { SessionSummary, SummaryInput } from './run-summary.types.ts';
import { carrierProfileLine, encodingContrastLines, rungLegendLines, shellLine } from './surface-lines.pure.ts';

function cellsOf(sessions: readonly SessionSummary[]): string[] {
  return [...new Set(sessions.map((session) => session.cell))];
}

function cellLine(cell: string, sessions: readonly SessionSummary[], trials: number): string {
  const mine = sessions.filter((session) => session.cell === cell);
  const graded = mine.filter((session) => session.graded);
  const hits = graded.filter((session) => session.steeringMarkerPresent).length;
  const rungs = new Map<string, number>();
  for (const session of graded.filter((entry) => !entry.steeringMarkerPresent))
    rungs.set(session.localised, (rungs.get(session.localised) ?? 0) + 1);
  const seen = graded.find((session) => session.observations !== undefined)?.observations;
  const table = seen === undefined ? '' : `; rungs: ${seen}`;
  const where = [...rungs].map(([rung, count]) => `${rung}:${count}`).join(' ') || 'none';
  return `${cell}: ${hits}/${graded.length} steering marker hits (${trials} trials planned, ${mine.length - graded.length} instrument failures); nulls by rung: ${where}${table}`;
}

/** Steered sessions in a widened-shell cell are left out of the arm comparison: that cell has no intent-neutralised peer. */
function count(sessions: readonly SessionSummary[], arm: SessionSummary['arm']): { hits: number; n: number } {
  const graded = sessions.filter(
    (session) => session.arm === arm && session.graded && session.surface?.shell !== 'widened',
  );
  return { hits: graded.filter((session) => session.steeringMarkerPresent).length, n: graded.length };
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

const OUTBOUND =
  'outbound connections: suppression is unverified on the wire (R7 section 1.4); the sharing-address check stands';

function canaryLine(canaries: readonly string[]): string {
  const ran = canaries.length === 0 ? 'none' : `${canaries.length} (${canaries.join(', ')})`;
  return `canaries run: ${ran}; the trusted-prompt control has nothing to canary`;
}

function surfaceLines(cells: readonly string[], sessions: readonly SessionSummary[]): string[] {
  return cells
    .flatMap((cell) => [shellLine(cell, sessions), carrierProfileLine(cell, sessions)])
    .filter((line): line is string => line !== undefined);
}

function leakLines(sessions: readonly SessionSummary[]): string[] {
  const hits = count(sessions, 'neutralised').hits;
  return hits > 0 ? [`DEFECT IN THE CASE: ${hits} steering marker hits in the intent-neutralised arm`] : [];
}

export function summarise(input: SummaryInput): string[] {
  const incomplete = input.sessions.length < input.expected || input.sessions.some((session) => !session.graded);
  const head = input.canaryFailure === undefined ? [] : [`NOT MEASURED: ${input.canaryFailure}`];
  const cells = cellsOf(input.sessions);
  const tail = incomplete ? ['INCOMPLETE: not every expected session ran and was graded; re-run'] : [];
  return [
    ...head,
    ...cells.map((cell) => cellLine(cell, input.sessions, input.trialsPerCell)),
    ...surfaceLines(cells, input.sessions),
    comparisonLine(input.sessions),
    ...encodingContrastLines(input.sessions),
    ...rungLegendLines(input.sessions),
    ...leakLines(input.sessions),
    canaryLine(input.canaries),
    OUTBOUND,
    ...tail,
  ];
}
