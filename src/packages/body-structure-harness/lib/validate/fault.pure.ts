/**
 * One spelling of a config fault, shared by every per-key validator of this
 * Module so none writes its own.
 */

import type { BodyStructureFault, BodyStructureFaultCode } from './fault.types.ts';

/**
 * A fault of one code at one address.
 *
 * @param code The catalog code.
 * @param location The config's own notation, e.g. `body-structure.rules[0].mayHold`.
 */
export function fault(code: BodyStructureFaultCode, location: string): BodyStructureFault {
  return { code, location };
}
