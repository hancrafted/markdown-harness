/**
 * One spelling of a config fault, shared by every per-key validator of this
 * Module so none writes its own (design-ADR 0020, 0029).
 */

import type { ConfigFault, ConfigFaultCode } from '../../../config-contract/index.ts';

/**
 * A fault of one code at one address.
 *
 * @param code The catalog code.
 * @param location The config's own notation, e.g. `body-structure.rules[0].mayHold`.
 */
export function fault(code: ConfigFaultCode, location: string): ConfigFault {
  return { code, location };
}
