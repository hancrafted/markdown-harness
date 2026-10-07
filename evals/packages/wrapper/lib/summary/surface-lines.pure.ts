// The summary lines that belong to a delivery surface rather than to a cell's rate:
//
//   the encoding contrast (rung 6)  pull cells that differ only in how the answer is encoded
//   the shell coverage hole (D6)    files created through the shell, in a cell that allowed it
//   the carrier profile (rung 9)    which tested carrier's steering marker decays
//
// Each prints a count out of its total beside the verdict, and says what it is not computed from.

import type { Encoding } from '../../../session/delivery-surface.ts';
import { grantsShellWrites } from '../../../session/delivery-surface.ts';
import { SIGNIFICANCE, fisherOneSided } from './arm-comparison.pure.ts';
import type { SessionSummary } from './run-summary.types.ts';

/** From simplest to richest: the intents alone, the hook's prose rendering, the raw JSON. */
const ENCODINGS_SIMPLEST_FIRST: Encoding[] = ['intent-only', 'prose', 'json'];

function pullSteered(sessions: readonly SessionSummary[]): SessionSummary[] {
  return sessions.filter(
    (session) => session.graded && session.arm === 'steered' && session.surface?.channel === 'pull',
  );
}

function tally(sessions: readonly SessionSummary[], encoding: string): { hits: number; n: number } {
  const mine = sessions.filter((session) => session.surface?.encoding === encoding);
  return { hits: mine.filter((session) => session.steeringMarkerPresent).length, n: mine.length };
}

function against(simple: { hits: number; n: number }, rich: { hits: number; n: number }): number {
  return fisherOneSided({
    steeredHits: simple.hits,
    steeredN: simple.n,
    neutralisedHits: rich.hits,
    neutralisedN: rich.n,
  });
}

function contrastVerdicts(sessions: readonly SessionSummary[], present: readonly string[]): string[] {
  const [simplest, ...richer] = present;
  const base = tally(sessions, simplest ?? '');
  return richer.map((encoding) => {
    const p = against(base, tally(sessions, encoding));
    const word =
      p < SIGNIFICANCE ? `rung 6 implicated, ${encoding} loses hits to ${simplest}` : 'no encoding effect shown';
    return `${encoding} vs ${simplest}: p=${p.toFixed(4)}, ${word}`;
  });
}

/** The prose-versus-JSON contrast: the pull cells' hit rates by encoding, and whether the richer ones lose to the simplest. */
export function encodingContrastLines(sessions: readonly SessionSummary[]): string[] {
  const steered = pullSteered(sessions);
  const present = ENCODINGS_SIMPLEST_FIRST.filter((encoding) => tally(steered, encoding).n > 0);
  if (present.length < 2) return [];
  const rates = present.map((encoding) => {
    const { hits, n } = tally(steered, encoding);
    return `${encoding} ${hits}/${n}`;
  });
  const head = `encoding contrast, pull (rung 6, exact one-sided Fisher, 5% level, PROVISIONAL): ${rates.join(', ')}`;
  return [head, ...contrastVerdicts(steered, present).map((line) => `  ${line}`)];
}

/** Files created through the shell, for a cell that allowed one: the Write matcher's coverage hole, measured. */
export function shellLine(cell: string, sessions: readonly SessionSummary[]): string | undefined {
  const mine = sessions.filter((session) => session.cell === cell && session.graded);
  if (mine.length === 0 || !grantsShellWrites(mine[0]?.surface?.shell)) return undefined;
  const created = mine.filter((session) => session.shellCreated === true).length;
  return `${cell}: created through the shell in ${created}/${mine.length} sessions (shell allowed; the hook matches Write only)`;
}

/** Per tested carrier, its hit count over a steered cell's graded sessions, when the case has more than one carrier. */
export function carrierProfileLine(cell: string, sessions: readonly SessionSummary[]): string | undefined {
  const mine = sessions.filter((session) => session.cell === cell && session.graded && session.arm !== 'neutralised');
  const addresses = Object.keys(mine[0]?.carrierHits ?? {});
  if (addresses.length < 2) return undefined;
  const parts = addresses.map((address) => {
    const hits = mine.filter((session) => session.carrierHits?.[address] === true).length;
    return `${address} ${hits}/${mine.length}`;
  });
  return `${cell}: carrier profile (rung 9): ${parts.join('; ')}`;
}

/**
 * What rung 2 means on a pull surface, printed when the run has one. The spec says rung 2 is "recorded not
 * applicable, not clean" for pull; this run reads that for the encodings with no rendering step and keeps rung 2 a
 * checked precondition for the prose encoding, which renders through the hook. For the intents alone a failing
 * precondition is the pull command's own answer failing, so it is not called rung 2.
 */
export function rungLegendLines(sessions: readonly SessionSummary[]): string[] {
  if (!sessions.some((session) => session.surface?.channel === 'pull')) return [];
  return [
    'rung 2 (pull): not applicable for json and intent-only (no rendering step); clean for prose, a checked precondition because it renders through the hook',
    'rung 2 legend deviates from the spec text ("not applicable, not clean" for pull); an intent-only precondition failure is named pull-answer-failed, an instrument failure, never rung 2',
  ];
}
