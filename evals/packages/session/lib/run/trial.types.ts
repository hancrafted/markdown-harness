import type { FailureKind, RawSession } from '../failure/failure-classifier.types.ts';
import type { SweepExpectation } from '../leak/leak-sweep.types.ts';
import type { MintSources } from '../mint/mint-plan.types.ts';
import type { ArmKind } from '../observe/session-observation.types.ts';
import type { DeliverySurface } from '../surface/delivery-surface.types.ts';

/** How a Host harness is invoked: a command prefix, so a self-test can point it at a stub. */
export interface HostSpec {
  readonly command: readonly string[];
  readonly model: string;
  readonly maxTurns: number;
  readonly wallClockMs: number;
  readonly tools: readonly string[];
}

/** One tested carrier's steering marker, and what the root must hold of it before the session starts. */
export interface TrialMarker {
  readonly steeringMarker: string;
  readonly sweepExpectation: SweepExpectation;
}

export interface TrialRequest {
  readonly arm: ArmKind;
  /** The delivery surface the trial measures: hook, pull command or user turn, and the shell the agent is given. */
  readonly surface: DeliverySurface;
  /** The instruction-file line a pull surface adds. */
  readonly pullLine: string;
  readonly sources: MintSources;
  readonly heldOut: readonly string[];
  /** The derived config for this arm, written over the seed's config in the minted root. */
  readonly derivedConfig: string;
  readonly host: HostSpec;
  readonly task: string;
  /** One entry per tested carrier. */
  readonly markers: readonly TrialMarker[];
  readonly targetPath: string;
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
