/**
 * The result variant a config that cannot be trusted comes back as.
 *
 * A config fault is result content rather than a throw (§4.5). A program whose
 * config errors arrive as stack traces has two output formats, and only one of
 * them is a contract.
 *
 * The FAULT itself is no longer declared here. `ConfigFault` and
 * `ConfigFaultCode` moved into `config-contract`, because the port a Module
 * declares through names a validation result, which names a fault — and this
 * Package names `FieldConstraints` back out of `config-contract`, so leaving the
 * fault here closed a cycle `no-circular` holds at `error`. `../index.ts`
 * re-exports both declarations, so every importer that reached for them here
 * still can.
 */

import type { ConfigFault } from '../../config-contract/index.ts';

/** The result variant returned when the config could not be trusted. */
export interface ConfigErrorResult {
  /** The one literal that marks the failure variant; `isConfigError` keys on its presence. */
  error: 'CONFIG_REJECTED';
  /** Every fault validation could find, not the first — a config fails whole (§3.5). */
  faults: readonly ConfigFault[];
}
