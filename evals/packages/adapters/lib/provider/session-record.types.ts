import type { deriveArm } from '../../../arms/derive-arms.ts';
import type { SectionScope, SteeringGrade } from '../../../grading/grade-steering-marker.ts';
import type { Localisation } from '../../../grading/localise-rung.ts';
import type { DeliverySurface } from '../../../session/delivery-surface.ts';
import type { ArmKind, SessionObservation } from '../../../session/observe-session.ts';
import type { TrialOutcome } from '../../../session/run-trial.ts';
import type { ParsedSession } from '../../../session/session-stream.ts';
import type { CaseVars, CellConfig, RunSettings } from './provider-config.types.ts';

/** The provider's sidecar for one session: authoritative, the eval tool's own store being a convenience. */
export interface SessionSidecar {
  readonly sessionKey: string;
  readonly cell: string;
  readonly arm: ArmKind;
  readonly graded: boolean;
  readonly failureKind?: string;
  readonly detail?: string;
  readonly sessionId?: string;
  /** The hit as the summary counts it: every steering marker present, or in the intent-neutralised arm any one. */
  readonly steeringMarkerPresent: boolean;
  readonly localised: string;
  /** Which surface the cell measured, so the summary can group by encoding and count shell-created files. */
  readonly surface?: DeliverySurface;
  readonly shellCreated?: boolean;
  /** Per tested carrier, whether its steering marker reached the final file: the partial-action profile. */
  readonly carrierHits?: Readonly<Record<string, boolean>>;
  readonly cohortRow?: Readonly<Record<string, unknown>>;
}

export interface CohortSources {
  readonly settings: RunSettings;
  readonly cell: CellConfig;
  readonly vars: CaseVars;
  readonly trialIndex: number;
  readonly providerId: string;
  readonly parsed: ParsedSession;
  readonly observation: SessionObservation;
  /** One grade per tested carrier, in the order of the case's carriers. */
  readonly grades: readonly SteeringGrade[];
  /** The address of each tested carrier, in the same order. */
  readonly addresses: readonly string[];
  readonly localised: Localisation;
  readonly digests: { readonly mh: string; readonly skills: string; readonly root: string; readonly config: string };
  readonly timing: { readonly startedAtMs: number; readonly durationMs: number; readonly nodeVersion: string };
  readonly charactersDelivered: number;
}

export interface SessionCall {
  readonly cellLabel: string;
  readonly config: unknown;
  readonly vars: unknown;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly trialIndex: number;
}

export interface SessionReturn {
  readonly output?: string;
  readonly error?: string;
  readonly metadata: Record<string, unknown>;
}

/** What a failed session reports: the failure's kind and detail, with where it happened. */
export interface FailureReport {
  readonly settings: RunSettings;
  readonly call: SessionCall;
  readonly arm: SessionSidecar['arm'];
  readonly kind: string;
  readonly detail: string;
}

/** One tested carrier of a trial: where it sits, the steering marker drawn for it, and where that belongs. */
export interface PreparedCarrier {
  readonly address: string;
  readonly steeringMarker: string;
  readonly clause: string;
  readonly scope: SectionScope;
  /** How many carrier strings held its placeholder, so how many times the steered root holds its steering marker. */
  readonly occurrences: number;
}

export interface Prepared {
  readonly carriers: readonly PreparedCarrier[];
  /** Every carrier's clause, joined: what the trusted-prompt control says in the user turn. */
  readonly clause: string;
  readonly derived: ReturnType<typeof deriveArm>;
}

export interface TrialParts {
  readonly settings: RunSettings;
  readonly cell: CellConfig;
  readonly vars: CaseVars;
}

export interface GradeParts extends TrialParts {
  readonly call: SessionCall;
  readonly prepared: Prepared;
  readonly outcome: TrialOutcome;
  readonly parsed: ParsedSession;
}
