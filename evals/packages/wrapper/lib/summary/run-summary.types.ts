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
  /** Which surface the cell measured; absent on a sidecar written before surfaces were recorded. */
  readonly surface?: { readonly channel: string; readonly shell: string; readonly encoding: string };
  /** A creating call was a shell call. */
  readonly shellCreated?: boolean;
  /** Per tested carrier, whether its steering marker reached the final file. */
  readonly carrierHits?: Readonly<Record<string, boolean>>;
}

export interface SummaryInput {
  readonly sessions: readonly SessionSummary[];
  readonly expected: number;
  readonly trialsPerCell: number;
  readonly canaryFailure: string | undefined;
  /** The canaries that were owed and run, each as host/channel/layout. */
  readonly canaries: readonly string[];
}
