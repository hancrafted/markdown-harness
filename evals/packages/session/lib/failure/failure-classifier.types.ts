import type { ParsedSession } from '../stream/session-stream.types.ts';

/** Every instrument failure the exit contract knows by name. */
export type FailureKind =
  | 'host-binary-missing'
  | 'authentication-failure'
  | 'rate-limit-exhausted'
  | 'wall-clock-timeout'
  | 'no-parseable-stream'
  | 'unrecognised-terminal-reason'
  | 'init-assertion-failed'
  | 'mint-refused'
  | 'rung-1-failed'
  | 'rung-2-failed'
  | 'pull-answer-failed'
  | 'canary-failed'
  | 'cohort-field-missing'
  | 'duplicate-session-id';

/** What the spawn itself reported, before any stream is read. */
export interface RawSession {
  /** The spawn error code, such as ENOENT, or undefined when the process started. */
  readonly spawnError: string | undefined;
  readonly timedOut: boolean;
  readonly stderr: string;
  readonly parsed: ParsedSession;
  /** A failure a check outside the session already named (a precondition, the canary, the mint); passed through. */
  readonly declared?: FailureKind;
}

export type Classification =
  | { readonly outcome: 'graded' }
  | { readonly outcome: 'instrument-failure'; readonly kind: FailureKind; readonly detail: string };

/** What the init event must show for a cell to count. */
export interface InitExpectation {
  readonly apiKeySource: string;
  readonly expectedPlugins: readonly string[];
}
