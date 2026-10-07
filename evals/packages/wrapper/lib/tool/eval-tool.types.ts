export interface ToolSettings {
  readonly configPath: string;
  readonly trials: number;
  readonly resultsPath: string;
  /** One, always, outside a self-test break. */
  readonly concurrency: number;
  /** Off, always, outside a self-test break. */
  readonly cache: boolean;
}
