export interface SweptFile {
  readonly path: string;
  readonly text: string;
}

/** What a root must hold: no occurrence at all, or exactly the occurrences the substitution placed. */
export type SweepExpectation = { readonly kind: 'none' } | { readonly kind: 'exactly'; readonly occurrences: number };

export interface SweepVerdict {
  readonly ok: boolean;
  /** Files opened. A sweep that opened none proves nothing and fails. */
  readonly filesOpened: number;
  readonly occurrences: number;
  readonly hits: readonly { readonly path: string; readonly count: number }[];
  readonly reason: string;
}
