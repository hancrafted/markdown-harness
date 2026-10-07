/** One intent carrier: where it sits, as a readable address and as the keys that reach it. */
export interface IntentCarrier {
  /** The path from the document root; a Rule is named by its `ruleId`, anything else below a list by index. */
  readonly address: string;
  /** The keys and list indices that reach the carrier's string, for a writer. */
  readonly path: readonly (string | number)[];
}
