/** R1's failure ladder, numbered as R0 settled it: ten rungs. */
export type RungNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * What one cell could say about one rung. `not-observable` means the cell had no
 * evidence for it; `not-applicable` means the rung does not exist for the cell
 * (rung 2 for pull) or is not instrumented in this phase (rungs 6 and 9).
 */
export type RungStatus = 'clean' | 'failed' | 'not-observable' | 'not-applicable';

export interface RungObservation {
  readonly rung: RungNumber;
  readonly status: RungStatus;
}

export type Localisation =
  | { readonly kind: 'rung'; readonly rung: RungNumber }
  | { readonly kind: 'clean' }
  | { readonly kind: 'cannot-localise'; readonly blockedBy: RungNumber };
