/**
 * The presence gate, and the evidence every violation carries.
 *
 * `required` means PRESENT AND NON-EMPTY, which is why there is no
 * `minLength: 1` anywhere in the config language.
 *
 * A FAILED PRESENCE SUPPRESSES EVERY OTHER CONSTRAINT AT THAT ADDRESS. Without
 * that, one missing `description` would report `presence`, `maxLength` and
 * `format` at once and the Contributor would read three faults about one hole.
 */

import type { FrontmatterValue } from '../../contract/frontmatter.ts';
import type { FieldValue } from '../../contract/values.ts';

export function isEmpty(value: FrontmatterValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * What was there, as evidence — the value itself for a scalar, a size for a
 * container.
 *
 * Only reached for a value that IS there. Absence is the omission of the `value`
 * key, not a summary of nothing, which is what keeps `value: null` meaning "the
 * key was written and holds nothing".
 */
export function summarise(value: FrontmatterValue): FieldValue {
  if (value === null) return null;
  if (Array.isArray(value)) return { items: value.length };
  if (typeof value === 'object') return { keys: Object.keys(value) };
  return value;
}

/**
 * The `value` key of a violation, or nothing at all.
 *
 * Spread into the literal rather than assigned, so an absent field produces a
 * violation with NO `value` key rather than one holding `undefined` — which
 * `JSON.stringify` would drop anyway, but only by accident, and a contract that
 * depends on a serialiser's incidental behaviour is not a contract.
 */
export function evidence(value: FrontmatterValue | undefined): { value?: FieldValue } {
  return value === undefined ? {} : { value: summarise(value) };
}
