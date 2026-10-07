import type { deriveArm } from '../../../arms/derive-arms.ts';
import type { SteeringGrade } from '../../../grading/grade-steering-marker.ts';
import type { Localisation } from '../../../grading/localise-rung.ts';
import type { SessionObservation } from '../../../session/observe-session.ts';
import type { TrialOutcome } from '../../../session/run-trial.ts';
import type { ParsedSession } from '../../../session/session-stream.ts';
import type { CaseVars, CellConfig, RunSettings } from './provider-config.types.ts';

/** The provider's sidecar for one session: authoritative, the eval tool's own store being a convenience. */
export interface SessionSidecar {
  readonly sessionKey: string;
  readonly cell: string;
  readonly arm: 'steered' | 'neutralised' | 'control';
  readonly graded: boolean;
  readonly failureKind?: string;
  readonly detail?: string;
  readonly sessionId?: string;
  readonly steeringMarkerPresent: boolean;
  readonly localised: string;
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
  readonly grade: SteeringGrade;
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

export interface Prepared {
  readonly steeringMarker: string;
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
