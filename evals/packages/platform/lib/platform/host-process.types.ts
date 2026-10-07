export interface RunRequest {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  /** The complete environment of the child; nothing is inherited. */
  readonly env: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  /** Standard input; closed (empty) when absent. */
  readonly input?: string;
}

export interface RunReport {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** The spawn error code, such as ENOENT; undefined when the process started. */
  readonly spawnError: string | undefined;
  readonly timedOut: boolean;
  readonly startedAtMs: number;
  readonly durationMs: number;
}
