/**
 * Read one case's frozen expectation, and supply the prefix its locations omit.
 *
 * A rejected-config case states its locations CASE-RELATIVE. Only the file-level
 * codes carry a filesystem path at all — the rest is the config's own notation,
 * which names a key and is already portable — so exactly one spelling needs a
 * prefix, and it is the adopter's own config filename. That is what keeps moving
 * the tier a rename instead of a rewrite of every expectation.
 *
 * Deterministic, so it carries the `pure` classifier: the case's config path
 * arrives as an argument rather than being joined here, which is also what keeps
 * `node:path` — an ambient read of the host's separator — out of this file.
 */

import type { FrozenFault, FrozenRejection } from './frozen-rejection.types.ts';

/**
 * The adopter's own config filename, and the one location a case may write
 * relative.
 *
 * The filename is shared by every case rather than being per-case, because
 * several codes carry the config path in their location: a per-case name would
 * put the case's own name inside the contract it is freezing.
 */
export const CASE_CONFIG_LOCATION = 'markdown-harness.config.yaml';

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A fault as frozen: two strings, both written out, neither derived. */
function isFrozenFault(value: unknown): value is FrozenFault {
  return isMapping(value) && typeof value.code === 'string' && typeof value.location === 'string';
}

/**
 * The response one case freezes, with its own config path substituted in.
 *
 * The substitution is an EXACT match on the config filename, never a prefix or
 * a contains: a config-notation location cannot equal the filename, so an exact
 * match is total, while a looser one could rewrite a location that merely
 * spells the filename inside itself and leave the rewrite looking like a pass.
 *
 * Throws rather than answering a default, and names the case when it does. A
 * malformed expectation that degraded into an empty rejection would compare
 * equal to nothing and fail somewhere else, naming the wrong file.
 *
 * @param parsed The case's expectation file, already parsed from JSON.
 * @param configPath Where this case's config file actually sits — the prefix the runner supplies.
 * @param at The case directory's name, so a broken expectation names itself.
 */
export function frozenRejection(parsed: unknown, configPath: string, at: string): FrozenRejection {
  if (!isMapping(parsed) || typeof parsed.error !== 'string') {
    throw new Error(`the ${at} case must freeze a mapping carrying an error string`);
  }
  if (!Array.isArray(parsed.faults) || !parsed.faults.every(isFrozenFault)) {
    throw new Error(`the ${at} case must freeze a fault list of code and location pairs`);
  }

  const faults = parsed.faults.map((fault): FrozenFault => ({
    code: fault.code,
    location: fault.location === CASE_CONFIG_LOCATION ? configPath : fault.location,
  }));

  return { error: parsed.error, faults };
}
