export interface SteeringMarkerDraw {
  readonly seed: string;
  readonly caseId: string;
  readonly address: string;
  /** Every tracked text the code must not already occur in. */
  readonly corpus: string;
}

export interface GuardFile {
  readonly path: string;
  readonly text: string;
}
