/** The two Host harnesses an eval cell can name. */
export type HostName = 'claude-code' | 'antigravity';

/** What a probe established: `unprobed` until a human with the account runs it and records the result here. */
export type ProbeStatus = 'unprobed' | 'works' | 'fails';

export interface Probe {
  readonly id: string;
  readonly question: string;
  readonly status: ProbeStatus;
}

/**
 * The facts about a Host harness that are not in its stream: how far a run can be isolated from the account's own
 * state, whether a turn cap exists, and which cohort fields its init event cannot supply.
 */
export interface HostProfile {
  readonly name: HostName;
  /** `flags`: command-line flags keep user-level state out. `none`: no such flag exists, so the account's state leaks in. */
  readonly isolation: 'flags' | 'none';
  /** The user-level surfaces that reach a session of this Host harness, or `none` when the flags keep them out. */
  readonly leakedSurface: string;
  /** `enforced`: a flag caps the turns. `none`: only the wall-clock bound limits a session. */
  readonly turnCap: 'enforced' | 'none';
  /** Cohort fields the stream cannot supply for this Host harness; `unknown` is legal for exactly these. */
  readonly unobservable: readonly string[];
  /** The model alias the canary runs with. */
  readonly canaryModel: string;
  /** The binary a live run invokes by absolute path or name when `--host-binary` is not given. */
  readonly binary: string;
  /** The probes a live run waits on. */
  readonly probes: readonly Probe[];
}
