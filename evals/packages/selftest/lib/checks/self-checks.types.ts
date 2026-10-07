/** One stub Host harness invocation, as the stub logged it. */
export interface StubInvocation {
  readonly nonce: string;
  readonly startedAt: number;
  readonly endedAt: number;
}

export interface MatrixRun {
  readonly exitCode: number;
  readonly invocations: readonly StubInvocation[];
  readonly sessionIds: readonly string[];
  /** The eval tool's captured output and results file, as text. */
  readonly toolText: string;
}

/** The runs of the break pass: concurrency raised on one, the cache turned on across several. */
export interface BreakRuns {
  readonly concurrency: MatrixRun;
  readonly cacheOn: readonly MatrixRun[];
}

export interface Finding {
  readonly check: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface MatrixExpectation {
  /** Sessions the matrix runs per execution, plus the canary. */
  readonly invocationsPerRun: number;
  readonly runs: number;
  readonly sharing: readonly string[];
}
