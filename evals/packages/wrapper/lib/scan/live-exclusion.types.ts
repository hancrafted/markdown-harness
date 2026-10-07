export interface ScanInput {
  /** The `scripts` of package.json. */
  readonly scripts: Readonly<Record<string, string>>;
  /** The gate and commit chains' entry script names. */
  readonly gateScripts: readonly string[];
  /** Workflow files by path, as text. */
  readonly workflows: Readonly<Record<string, string>>;
  /** The names that must never appear in a gate chain or workflow: live and self-test script names, the eval tool, a Host harness invocation. */
  readonly forbidden: readonly string[];
}

export interface ScanReport {
  /** Every script name reached by expanding the gate chains, so a non-empty report proves the scan read something. */
  readonly chain: readonly string[];
  readonly violations: readonly string[];
}
