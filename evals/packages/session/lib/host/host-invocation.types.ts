export interface ClaudeArgvInput {
  readonly task: string;
  /** An explicit model alias; never the Host harness default. */
  readonly model: string;
  readonly maxTurns: number;
  /** The tools the session is given; the shell is in the set only for a surface that grants one. */
  readonly tools: readonly string[];
  /** Shell permission patterns pre-approved for the session; any other shell command is denied in a headless run. */
  readonly allowedTools: readonly string[];
}

export interface AgyArgvInput {
  readonly task: string;
  /** An explicit model id from `agy models`; never the Host harness default. */
  readonly model: string;
  /** The wall-clock bound; `agy` has no turn cap, so this is the only limit on a session. */
  readonly wallClockMs: number;
  /** The `--mode` value the scoped permission probe found, passed in place of skipping every permission; undefined skips all. */
  readonly scopedMode: string | undefined;
}
