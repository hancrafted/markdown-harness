import type { ProbeRecord } from '../../../session/host-profile.ts';
import type { RunArgs } from '../args/run-args.types.ts';
import type { CanaryKey } from '../canary/canary-keys.types.ts';
import type { SidecarRow } from '../results/results-reading.types.ts';

export interface RunPlan {
  readonly args: RunArgs;
  readonly checkout: string;
  readonly runId: string;
  readonly runDir: string;
  readonly seed: string;
  readonly cells: number;
  readonly cases: number;
  readonly expected: number;
  /** The canaries the matrix owes, one for each Host harness, delivery channel and root layout it reaches. */
  readonly canaryKeys: readonly CanaryKey[];
  readonly host: {
    readonly command: readonly string[];
    readonly maxTurns: number;
    readonly wallClockMs: number;
    readonly tools: readonly string[];
    /** The recorded probe outcomes the run started with; the provider derives isolation and permissions from them. */
    readonly probes: ProbeRecord;
    /** The account's real home, which a scratch home's credential files would be copied from. */
    readonly home: string;
  };
  /** A refusal for each cell naming a host no profile knows, read from the configuration. */
  readonly cellRefusals: readonly string[];
  readonly revision: string;
  readonly dirty: string;
}

export interface ToolRun {
  readonly output: string;
  readonly spawnError: string | undefined;
}

export interface RunResults {
  readonly rows: readonly SidecarRow[];
  readonly duplicates: readonly string[];
  readonly toolCount: number | undefined;
}
