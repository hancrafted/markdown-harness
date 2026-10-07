export interface RunArgs {
  readonly host: 'claude' | 'stub';
  readonly trials: number;
  readonly seed: string | undefined;
  readonly allowOverBudget: boolean;
  readonly stubMode: string;
  /** A Host harness binary to run instead of `claude`; the self-test points it at a missing path. */
  readonly hostBinary: string | undefined;
  /** A tool setting the self-test deliberately breaks to see a check go red; never set on a live run. */
  readonly break: 'none' | 'concurrency' | 'cache';
}

export type ArgsResult =
  { readonly ok: true; readonly args: RunArgs } | { readonly ok: false; readonly problem: string };
