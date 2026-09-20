/**
 * The rejection payload, shared by every command.
 *
 * A config fault is result content rather than a throw (§4.5). A program whose
 * config errors arrive as stack traces has two output formats, and only one of
 * them is a contract.
 */

import type { ConfigFault, ConfigFaultCode } from '../../config-contract/index.ts';

export type { ConfigFault, ConfigFaultCode };

/** The result variant returned when the config could not be trusted. */
export interface ConfigErrorResult {
  /** The one literal that marks the failure variant; `isConfigError` keys on its presence. */
  error: 'CONFIG_REJECTED';
  /** Every fault validation could find, not the first — a config fails whole (§3.5). */
  faults: readonly ConfigFault[];
}
