export interface Closure {
  /** Named but not a Package root file that exists. */
  readonly unresolved: readonly string[];
  /** A tool-invoked Package root nothing names. */
  readonly unreferenced: readonly string[];
}
