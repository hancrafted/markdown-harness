import type { RunArgs } from '../args/run-args.types.ts';
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
  readonly host: {
    readonly command: readonly string[];
    readonly maxTurns: number;
    readonly wallClockMs: number;
    readonly tools: readonly string[];
  };
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
