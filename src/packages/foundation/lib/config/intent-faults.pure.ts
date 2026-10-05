/**
 * Validate a written `intent`, wherever a Module's section admits one.
 *
 * `CONFIG_EMPTY_INTENT` is the Core's code, so what counts as blank is the
 * Core's to answer, once: two Modules judging it apart would give one config
 * two verdicts for the same key. Blank is `''`, or `intent:` with nothing after
 * it, which parses to null. Anything else that is not a string — `false`, `0`,
 * a list — is a value of the wrong type, `CONFIG_INVALID_VALUE`, never blank.
 *
 * Whether an intent is OWED is not answered here: a Rule with none is the
 * Module's `CONFIG_MISSING_RULE_INTENT`, and other carriers may omit it.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import { invalidValue } from './selector-faults.pure.ts';

/**
 * The fault a written `intent` carries, if any; none when the key is absent.
 *
 * @param carrier A mapping that may carry `intent:`, straight off the YAML.
 * @param at The carrier's address; the fault points at `${at}.intent`.
 */
export function intentFaults(carrier: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (!('intent' in carrier)) return [];
  const written = carrier.intent;
  if (written === '' || written === null) return [{ code: 'CONFIG_EMPTY_INTENT', location: `${at}.intent` }];
  return typeof written === 'string' ? [] : [invalidValue(`${at}.intent`)];
}
