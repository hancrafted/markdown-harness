/** The two Host harnesses an eval cell can name. */
export type HostName = 'claude-code' | 'antigravity';

/** The name the wrapper's `--host` flag gives a Host harness; the one other vocabulary, mapped in the profile table. */
export type WrapperHost = 'claude' | 'agy';

/** Which matrix of cells and cases a run measures: each is one committed configuration file. */
export type MatrixName = 'push' | 'pull' | 'carriers' | 'assess' | 'agy';

/** The capabilities an Antigravity run waits on, in the order they must be probed. */
export type ProbeId = 'hook-fires-headless' | 'scoped-permission-mode' | 'scratch-home-credentials';

/** What a probe established: `unprobed` until a human with the account runs it and the result is recorded. */
export type ProbeStatus = 'unprobed' | 'works' | 'fails';

/** One recorded probe outcome: what the probe saw, written by the probe tool and read by the profile. */
export interface ProbeResult {
  readonly status: 'works' | 'fails';
  readonly detail: string;
  readonly recordedAt: string;
  /** For the scoped permission probe: the `--mode` value that let a write through. */
  readonly mode?: string;
  /** For the scoped permission probe: the permission mode the init event reported under that flag. */
  readonly permissionMode?: string;
}

/** Every recorded probe outcome; a probe with no entry is unprobed. */
export type ProbeRecord = Readonly<Partial<Record<ProbeId, ProbeResult>>>;

export interface Probe {
  readonly id: ProbeId;
  readonly question: string;
  readonly status: ProbeStatus;
}

/**
 * The facts about a Host harness that are not in its stream: how far a run can be isolated from the account's own
 * state, whether a turn cap exists, which cohort fields its init event cannot supply, and the names it goes by.
 * Isolation, the leaked surface and the permission scope are derived from the probe record, never written by hand.
 */
export interface HostProfile {
  readonly name: HostName;
  /** The name the wrapper's `--host` flag gives this Host harness. */
  readonly wrapperName: WrapperHost;
  /** The matrices this Host harness runs; a matrix runs under no other. */
  readonly matrices: readonly MatrixName[];
  /** `flags`: command-line flags keep user-level state out. `scratch-home`: a scratch HOME does. `none`: nothing does. */
  readonly isolation: 'flags' | 'scratch-home' | 'none';
  /** The user-level surfaces that reach a session of this Host harness, or `none` when something keeps them out. */
  readonly leakedSurface: string;
  /** `enforced`: a flag caps the turns. `none`: only the wall-clock bound limits a session. */
  readonly turnCap: 'enforced' | 'none';
  /** What the permission flags let a headless session do: `skip-all`, or `scoped:<mode>`. */
  readonly permissionScope: string;
  /** The scoped permission mode the argv passes in place of skipping every permission, when its probe works. */
  readonly scopedMode: string | undefined;
  /** The permission mode the init event must report for a cell to count, when the Host harness reports one. */
  readonly initPermissionMode: string | undefined;
  /** Cohort fields the stream cannot supply for this Host harness; `unknown` is legal for exactly these. */
  readonly unobservable: readonly string[];
  /** The model alias the canary runs with. */
  readonly canaryModel: string;
  /** The binary a live run invokes, by bare name on PATH, when neither `--host-binary` nor its variable is set. */
  readonly binary: string;
  /** The environment variable that overrides the binary. */
  readonly binaryVariable: string;
  /** A prefix a cell label carries for this Host harness; empty for the one whose cells predate the second. */
  readonly labelPrefix: string;
  /** The probes a live run waits on, with the status the record gives each. */
  readonly probes: readonly Probe[];
}
