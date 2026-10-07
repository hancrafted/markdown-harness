export interface ResultRow {
  /** True when the session ran and was graded, whatever the grade; false when the instrument failed. */
  readonly graded: boolean;
  readonly failureKind?: string;
}

export interface ExitInput {
  /** The result rows read from the eval tool's results file; undefined when no file was written. */
  readonly rows: readonly ResultRow[] | undefined;
  /** The count the configuration says must exist. */
  readonly expected: number;
  /** The count the eval tool's own statistics report, for the cross-check; undefined when unreadable. */
  readonly toolCount: number | undefined;
  /** A failure the wrapper itself named: missing binary, failed canary and the like. */
  readonly wrapperFailure?: string;
}

export interface ExitVerdict {
  /** 0 every expected session ran and was graded; 1 an instrument failure; 2 misuse. */
  readonly code: 0 | 1 | 2;
  readonly reasons: readonly string[];
}
