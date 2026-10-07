export interface RunArgs {
  readonly host: 'claude' | 'stub';
  readonly trials: number;
  readonly seed: string | undefined;
  readonly allowOverBudget: boolean;
  readonly stubMode: string;
  /** A Host harness binary to run instead of `claude`; the self-test points it at a missing path. */
  readonly hostBinary: string | undefined;
}

export type ArgsResult =
  { readonly ok: true; readonly args: RunArgs } | { readonly ok: false; readonly problem: string };
