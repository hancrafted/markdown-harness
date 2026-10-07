// Reading what a run left behind. The provider's sidecars are authoritative; the
// eval tool's own statistics are a cross-check, never the source.

import { pairCohorts } from '../../../session/cohort-row.ts';
import type { SessionSummary } from '../summary/run-summary.types.ts';
import type { SidecarRow } from './results-reading.types.ts';

export function parseSidecar(text: string): SidecarRow | undefined {
  try {
    const raw = JSON.parse(text) as SessionSummary & { sessionId?: string; cohortRow?: Record<string, unknown> };
    if (typeof raw.cell !== 'string' || typeof raw.graded !== 'boolean') return undefined;
    const observations = typeof raw.cohortRow?.observations === 'string' ? raw.cohortRow.observations : undefined;
    return { sessionId: raw.sessionId, cohortRow: raw.cohortRow, summary: { ...raw, observations } };
  } catch {
    return undefined;
  }
}

/** Session identifiers that occur more than once among graded rows. */
export function duplicateSessionIds(rows: readonly SidecarRow[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of rows.flatMap((row) => (row.sessionId === undefined ? [] : [row.sessionId]))) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

/** The tool's own count of sessions, from its results file, or undefined when it cannot be read. */
export function toolSessionCount(resultsText: string): number | undefined {
  try {
    const stats = (JSON.parse(resultsText) as { results?: { stats?: Record<string, number> } }).results?.stats;
    if (stats === undefined) return undefined;
    const parts = [stats.successes, stats.failures, stats.errors];
    return parts.every((part) => typeof part === 'number')
      ? parts.reduce((sum, part) => sum + (part ?? 0), 0)
      : undefined;
  } catch {
    return undefined;
  }
}

function differingWithin(group: readonly SidecarRow[]): string[] {
  const cohorts = group.flatMap((row) => (row.cohortRow === undefined ? [] : [row.cohortRow]));
  const [first, ...rest] = cohorts;
  if (first === undefined) return [];
  return rest.flatMap((other) => {
    const pairing = pairCohorts(first, other);
    return pairing.ok ? [] : [...pairing.differing];
  });
}

/** Cohort fields on which rows of one cell disagree within a run: such rows are never compared. */
export function unpairedFields(rows: readonly SidecarRow[]): string[] {
  const cells = [...new Set(rows.map((row) => row.summary.cell))];
  return [...new Set(cells.flatMap((cell) => differingWithin(rows.filter((row) => row.summary.cell === cell))))];
}
