/** What one run of an eval script left: its exit code, everything it printed, and the run directory it named. */
export interface Execution {
  readonly exitCode: number;
  readonly stdout: string;
  readonly runDir: string | undefined;
}
