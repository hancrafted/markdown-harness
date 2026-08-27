/**
 * The presence gate.
 *
 * `required` means PRESENT AND NON-EMPTY, which is why there is no
 * `minLength: 1` anywhere in the config language.
 *
 * A FAILED PRESENCE SUPPRESSES EVERY OTHER CONSTRAINT AT THAT ADDRESS. Without
 * that, one missing `description` would report `presence`, `maxLength` and
 * `format` at once and the Contributor would read three sentences about one
 * hole.
 */

import type { FrontmatterValue } from '../../contract/frontmatter.ts';
import type { Observed } from '../../contract/values.ts';

export function isEmpty(value: FrontmatterValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/** What was there, as evidence. */
export function observe(value: FrontmatterValue | undefined): Observed {
  if (value === undefined) return { kind: 'absent' };
  if (value === null) return { kind: 'null' };
  if (Array.isArray(value)) return { kind: 'list', length: value.length };
  if (typeof value === 'object') return { kind: 'mapping', keys: Object.keys(value) };
  return { kind: 'scalar', value };
}
