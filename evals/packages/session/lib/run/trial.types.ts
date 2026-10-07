import type { FailureKind, RawSession } from '../failure/failure-classifier.types.ts';
import type { SweepExpectation } from '../leak/leak-sweep.types.ts';
import type { MintSources } from '../mint/mint-plan.types.ts';
import type { ArmKind } from '../observe/session-observation.types.ts';

/** How a Host harness is invoked: a command prefix, so a self-test can point it at a stub. */
export interface HostSpec {
  readonly command: readonly string[];
  readonly model: string;
  readonly maxTurns: number;
  readonly wallClockMs: number;
  readonly tools: readonly string[];
}

export interface TrialRequest {
  readonly arm: ArmKind;
  readonly sources: MintSources;
  readonly heldOut: readonly string[];
  /** The derived config for this arm, written over the seed's config in the minted root. */
  readonly derivedConfig: string;
  readonly host: HostSpec;
  readonly task: string;
  readonly steeringMarker: string;
  readonly targetPath: string;
  /** What the root must hold of the steering marker before the session starts. */
  readonly sweepExpectation: SweepExpectation;
  /** A parent for the mint; defaults to the system temporary directory. */
  readonly under?: string;
  readonly keepRoot?: boolean;
}

export interface TrialOutcome {
  /** A failure a check before or around the session named; undefined when the session ran. */
  readonly declared: { readonly kind: FailureKind; readonly detail: string } | undefined;
  readonly root: string | undefined;
  readonly mintedRootDigest: string | undefined;
  readonly configDigest: string | undefined;
  readonly skillScriptsDigest: string | undefined;
  readonly mhDigest: string | undefined;
  readonly raw: RawSession | undefined;
  readonly startedAtMs: number;
  readonly durationMs: number;
  readonly finalFile: string | undefined;
  readonly changedFiles: readonly string[];
  readonly sweepFilesOpened: number;
}
