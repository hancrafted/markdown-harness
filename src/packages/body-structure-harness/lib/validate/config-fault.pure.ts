/**
 * The two fault shapes every validator in this Package raises, written once:
 * a value outside its declared type, and a key outside the vocabulary of the
 * mapping it sits in (design-ADR 0016).
 */

import type { ConfigFault } from '../../../config-contract/index.ts';

/**
 * A key written with a value outside its declared type.
 *
 * @param location The address of the key, e.g. `body-structure.rules[0].levels`.
 */
export function invalidValue(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

/**
 * One fault per key the mapping writes outside its vocabulary, in the order
 * written. Only the vocabulary's OWN keys count, so a key every object
 * inherits is still refused.
 *
 * @param written A mapping straight off the YAML.
 * @param known The vocabulary, keyed by the type declaring it.
 * @param at The mapping's address.
 */
export function unrecognisedKeys(written: Record<string, unknown>, known: object, at: string): readonly ConfigFault[] {
  return Object.keys(written)
    .filter((key) => !Object.hasOwn(known, key))
    .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${key}` }));
}
