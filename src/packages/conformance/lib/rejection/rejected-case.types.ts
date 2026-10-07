import type { FrozenComparison } from '../spec-folder/spec-folder.types.ts';

/** Everything one rejected-config case states and what one run of `mh` inside it answered. */
export interface RejectedCaseReport {
  /** What the report calls the case directory. */
  readonly case: string;
  /** The config's opening comment line, or `undefined` when the case holds no readable config to open. */
  readonly fault: string | undefined;
  /** `expected-rejection.json` always, and `expected-check-response.json` where the case freezes the whole envelope. */
  readonly frozen: readonly FrozenComparison[];
  readonly agrees: boolean;
}
