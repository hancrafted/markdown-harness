/**
 * Validate an `intent:` wherever this Module's section admits one: on a Rule,
 * on a heading entry, and on an item of an entry's `allowed` list. One spelling
 * of what blank means, so the three cannot disagree.
 */

import { invalidValue } from '../../../foundation/selector-faults.ts';
import { fault } from './fault.pure.ts';
import type { BodyStructureFault } from './fault.types.ts';

/**
 * An `intent` written and left blank — empty, or `intent:` with nothing after
 * it, which parses to null — or written as anything but a string. Never checked
 * here for being absent.
 *
 * @param carrier A Rule, a heading entry or an `allowed` item, straight off the YAML.
 * @param at The carrier's address.
 */
export function intentFaults(carrier: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  if (!('intent' in carrier)) return [];
  const written = carrier.intent;
  if (written === '' || written === null) return [fault('CONFIG_EMPTY_INTENT', `${at}.intent`)];
  return typeof written === 'string' ? [] : [invalidValue(`${at}.intent`)];
}
