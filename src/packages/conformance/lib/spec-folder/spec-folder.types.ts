/** One case in a spec folder: what its marker states and what one `check` of the folder observed. */
export interface CaseLine {
  readonly path: string;
  /** PASSES, FAILS or UNGOVERNED, from the case's `expect:` marker or the verbatim manifest. */
  readonly stated: string;
  /** Whether the folder's `check` listed the case as a failing file. */
  readonly listed: boolean;
  /** FAILS is listed and nothing else is, so the marker and the run agree. */
  readonly agrees: boolean;
}

/** One frozen file held against what one run of `mh` printed. */
export interface FrozenComparison {
  /** The frozen file, named relative to its spec folder, with the queried path for a query entry. */
  readonly label: string;
  readonly agrees: boolean;
  /** Line diff, expected (`-`) against actual (`+`); empty when they agree. */
  readonly diff: readonly string[];
}

/** Everything one spec folder states and everything one run of it answered. */
export interface SpecFolderReport {
  readonly folder: string;
  /** The sentence on the config's first line, or `undefined` when line 1 is not `# Spec: …`. */
  readonly spec: string | undefined;
  readonly cases: readonly CaseLine[];
  /** Governed cases the markers state, against the governed count `check` reported. */
  readonly governed: { readonly stated: number; readonly reported: number | undefined };
  readonly frozen: readonly FrozenComparison[];
  readonly agrees: boolean;
}
