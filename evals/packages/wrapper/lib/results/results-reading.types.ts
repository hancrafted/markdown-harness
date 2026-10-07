import type { SessionSummary } from '../summary/run-summary.types.ts';

export interface SidecarRow {
  readonly sessionId?: string;
  /** The cohort row, present on graded sessions. */
  readonly cohortRow?: Readonly<Record<string, unknown>>;
  readonly summary: SessionSummary;
}
