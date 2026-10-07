import type { SectionScope } from '../../../grading/grade-steering-marker.ts';
import type { DeliveryChannel, Encoding, ShellScope } from '../../../session/delivery-surface.ts';
import type { HostName, ProbeRecord } from '../../../session/host-profile.ts';
import type { ArmKind } from '../../../session/observe-session.ts';

/**
 * Provider options for one cell: Host harness, model, arm and delivery surface are fields, never defaults. The
 * surface is three fields that must agree: the delivery channel, what the shell is allowed, and the encoding.
 */
export interface CellConfig {
  readonly arm: ArmKind;
  readonly deliveryChannel: DeliveryChannel;
  readonly shell: ShellScope;
  readonly encoding: Encoding;
  readonly model: string;
  readonly hostName: HostName;
}

/** One tested carrier a case declares: the placeholder it holds, the clause to put there, and where the steering marker belongs. */
export interface CaseCarrier {
  readonly placeholder: string;
  readonly clauseTemplate: string;
  readonly scope: SectionScope;
}

/** The test-case variables a case file supplies. */
export interface CaseVars {
  readonly caseId: string;
  /** The Contributor-voiced task, phrased as a person would ask. */
  readonly task: string;
  readonly targetPath: string;
  readonly seedDir: string;
  /** The tested carriers, in the order their steering markers are drawn; one for a single-carrier case. */
  readonly carriers: readonly CaseCarrier[];
  readonly controlPrefix: string;
  /** The constructed instruction-file line a pull cell adds to the root. */
  readonly pullLine: string;
}

/** What the wrapper tells the provider through the environment. */
export interface RunSettings {
  readonly checkout: string;
  readonly runId: string;
  readonly runDir: string;
  readonly seed: string;
  readonly toolVersion: string;
  readonly wrapperRevision: string;
  readonly wrapperDirty: string;
  readonly host: {
    readonly command: readonly string[];
    readonly maxTurns: number;
    readonly wallClockMs: number;
    readonly tools: readonly string[];
    readonly probes: ProbeRecord;
    readonly home: string;
  };
}

export interface TaskParts {
  readonly arm: CellConfig['arm'];
  readonly task: string;
  readonly controlPrefix: string;
  readonly clause: string;
}
