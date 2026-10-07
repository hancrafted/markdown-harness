// The failure-ladder localiser. A null localises to exactly one rung: the first,
// in R1's decision-procedure order, that failed — unless an earlier rung could
// not be observed, in which case the answer is `cannot-localise` naming that
// rung, because the later failure might be its symptom.

import type { Localisation, RungNumber, RungObservation, RungStatus } from './rung-localiser.types.ts';

const RUNGS: readonly RungNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** A full observation record: every rung clean unless the overrides say otherwise. */
export function rungObservations(overrides: Partial<Record<RungNumber, RungStatus>>): RungObservation[] {
  return RUNGS.map((rung) => ({ rung, status: overrides[rung] ?? 'clean' }));
}

export function localiseRung(observations: readonly RungObservation[]): Localisation {
  const ordered = [...observations].sort((left, right) => left.rung - right.rung);
  const failed = ordered.find((observation) => observation.status === 'failed');
  if (failed === undefined) return { kind: 'clean' };
  const blocker = ordered.find(
    (observation) => observation.rung < failed.rung && observation.status === 'not-observable',
  );
  return blocker === undefined
    ? { kind: 'rung', rung: failed.rung }
    : { kind: 'cannot-localise', blockedBy: blocker.rung };
}

const WORDS: Record<RungStatus, string> = {
  clean: 'observed',
  failed: 'observed',
  'not-observable': 'not observable',
  'not-applicable': 'not applicable',
};

/** One line per rung saying whether the cell could observe it; derived from the record, never hand-written. */
export function observableTable(observations: readonly RungObservation[]): string[] {
  return [...observations]
    .sort((left, right) => left.rung - right.rung)
    .map((observation) => `${observation.rung} ${WORDS[observation.status]}`);
}
