import type { MatrixName, WrapperHost } from '../../../session/host-profile.ts';

export interface RunArgs {
  readonly host: WrapperHost | 'stub';
  readonly matrix: MatrixName;
  readonly trials: number;
  readonly seed: string | undefined;
  readonly allowOverBudget: boolean;
  readonly stubMode: string;
  /** A Host harness binary to run instead of `claude`; the self-test points it at a missing path. */
  readonly hostBinary: string | undefined;
  /** The probe record to read instead of the default path; a stand-in run reads none unless this is given. */
  readonly probeRecord: string | undefined;
  /** The wall-clock bound of one session in seconds, in place of the default for the Host harness. */
  readonly wallClockSeconds: number | undefined;
  /** A tool setting the self-test deliberately breaks to see a check go red; never set on a live run. */
  readonly break: 'none' | 'concurrency' | 'cache';
}

export type ArgsResult =
  { readonly ok: true; readonly args: RunArgs } | { readonly ok: false; readonly problem: string };
