import type { ArmKind } from '../../../session/observe-session.ts';

export interface SessionSummary {
  readonly cell: string;
  readonly arm: ArmKind;
  readonly graded: boolean;
  readonly failureKind?: string;
  readonly steeringMarkerPresent: boolean;
  /** The localised rung as printed: a number, `clean`, or `cannot localise`. */
  readonly localised: string;
  /** The rungs the cell could observe, printed from the record: `1 observed; 2 not applicable; ...`. */
  readonly observations?: string;
}

export interface SummaryInput {
  readonly sessions: readonly SessionSummary[];
  readonly expected: number;
  readonly trialsPerCell: number;
  readonly canaryFailure: string | undefined;
  /** The canaries that were owed and run, each as host/channel/layout. */
  readonly canaries: readonly string[];
}
