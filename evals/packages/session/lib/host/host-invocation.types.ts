export interface ClaudeArgvInput {
  readonly task: string;
  /** An explicit model alias; never the Host harness default. */
  readonly model: string;
  readonly maxTurns: number;
  /** The tools the session may use; phase 1 forbids shell use in the push arm by leaving it out. */
  readonly tools: readonly string[];
}
