/**
 * What a violation says about the value it found, and what counts as empty.
 *
 * Both halves are here because both are the same decision seen twice: a report
 * describes a value without reproducing it. Containers contribute their size or
 * their key names and never their contents — frontmatter lists are unbounded,
 * and a violation repeats per file across a corpus.
 *
 * Emptiness has ONE definition in this tool, and it lives here. `presence:
 * required` and every cross-field set both consult it, which is what stops
 * `title: ''` from satisfying `allOf: [title, description]` while
 * simultaneously failing `required`.
 */

import type { FieldValue } from '../../../response-contract/index.ts';

/** A mapping, for the purpose of naming its keys. */
function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Describe a value for a report.
 *
 * Only called for an address that named something: absence is the `value` key's
 * OMISSION and never `null`, so that `null` keeps its literal meaning of "the
 * key was written with no value".
 *
 * @param value The value found at the address.
 */
export function evidenceFor(value: unknown): FieldValue {
  if (Array.isArray(value)) return { items: value.length };
  if (isMapping(value)) return { keys: Object.keys(value) };
  return value as FieldValue;
}

/**
 * Whether a value counts as empty.
 *
 * `''`, `[]`, `{}` and a bare key, and nothing else. NOTE that `0` and `false`
 * are not empty: reading emptiness off JavaScript truthiness would tell an
 * author to fill in a field they had deliberately set, which is the one kind of
 * advice a steering instrument must not give.
 *
 * @param value The value found at the address.
 */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return isMapping(value) ? Object.keys(value).length === 0 : false;
}
