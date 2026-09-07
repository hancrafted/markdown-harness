/**
 * What each stage of loading hands back.
 *
 * Every stage returns faults alongside its value rather than throwing, because
 * a config fails whole (§3.5): the loader concatenates what each stage found
 * and rejects once, carrying every fault it could reach.
 */

import type { MarkdownHarnessConfig } from '../../config-contract/index.ts';
import type { ConfigFault } from '../../response-contract/index.ts';

/** A YAML mapping, before any key of it has been recognised. */
export type ConfigMapping = Record<string, unknown>;

/** The outcome of reading bytes off disk. */
export interface ConfigSource {
  /** The file's contents, absent when reading failed. */
  text?: string;
  /** Why reading failed; empty when it did not. */
  faults: readonly ConfigFault[];
}

/** The outcome of parsing those bytes and checking they form a mapping. */
export interface ConfigParse {
  /** The parsed mapping, absent when the bytes were not one. */
  document?: ConfigMapping;
  /** Why parsing failed; empty when it did not. */
  faults: readonly ConfigFault[];
}

/** The outcome of the whole load: a config to trust, or every reason not to. */
export interface ConfigLoad {
  /** The validated config, absent when any fault was found. */
  config?: MarkdownHarnessConfig;
  /** Every fault found across every stage, in reporting order. */
  faults: readonly ConfigFault[];
}
