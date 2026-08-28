/** A half-open span of time, as two instants in milliseconds since the epoch. */
export interface Span {
  readonly from: number;
  readonly to: number;
}
