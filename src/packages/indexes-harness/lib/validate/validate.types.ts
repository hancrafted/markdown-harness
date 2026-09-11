/**
 * What validating this Module's section hands back.
 *
 * Faults travel alongside the value rather than being thrown, because a config
 * fails WHOLE: the loader concatenates what every stage found and rejects once,
 * carrying every fault it could reach.
 */

import type { IndexesConfig } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';

/** The outcome of validating the `indexes:` section. */
export interface IndexesValidation {
  /**
   * The validated section, absent when any fault was found — AND absent when
   * the key was never written, which is not a fault. The caller distinguishes
   * the two by whether `faults` is empty.
   */
  section?: IndexesConfig;
  /** Every fault the section carries, in reporting order. */
  faults: readonly ConfigFault[];
}
