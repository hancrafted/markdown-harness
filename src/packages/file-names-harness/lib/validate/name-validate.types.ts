/**
 * What validating this Module's section produces.
 *
 * An optional value paired with a fault LIST, rather than a tagged union: an
 * empty list is a real count and carries no second meaning, so the pair is
 * already unambiguous. The same shape `config-loader`'s own stages use.
 */

import type { FileNamesConfig } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';

/** The section when it is sound, and everything wrong with it when it is not. */
export interface NameSectionValidation {
  /**
   * The section itself, ABSENT when it could not be trusted.
   *
   * Also absent, with no faults, when the key was never written — governance is
   * opt-in, so a repo with no naming rules is an ordinary repo rather than a
   * misconfigured one.
   */
  section?: FileNamesConfig;
  /** Every fault found, in the order the Operator would scan them. */
  faults: readonly ConfigFault[];
}
