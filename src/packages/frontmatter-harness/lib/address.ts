/**
 * Field addressing, one level deep.
 *
 * The vocabulary is OKF's own — the pinned revision writes `sources[].id`
 * (§5.1), `sources[].resource` twice (§6.2) and `verified[].by` (§7). Adopted,
 * not invented.
 *
 *   description          a top-level key
 *   generated.by         a key inside a mapping
 *   sources[].resource   a key inside EVERY entry of a list
 *
 * An address fans out to zero or more INSTANCES. `sources[].resource` over a
 * two-entry list is two instances, addressed `sources[0].resource` and
 * `sources[1].resource` — the index resolved, because a report that said `[]`
 * would not tell the Contributor which entry to fix. That instance address is
 * also why no violation carries a line number.
 */

import type { FieldAddress } from '../../contract/constraints.ts';
import type { Frontmatter, FrontmatterMapping, FrontmatterValue } from '../../contract/frontmatter.ts';

/** One resolved location an address reached, and what was there. */
export interface Instance {
  /** The address with any `[]` replaced by the real index. */
  at: FieldAddress;
  /** `undefined` distinguishes "the key is not there" from "the key is there and holds null". */
  value: FrontmatterValue | undefined;
}

interface Parsed {
  head: string;
  /** True for `head[].tail` — the head is a list and the tail applies to every entry. */
  perEntry: boolean;
  tail: string | null;
}

/** The top-level key an address starts at. This is what "known" means for `unknownKeys`. */
export function head(address: FieldAddress): string {
  return parse(address).head;
}

function parse(address: FieldAddress): Parsed {
  const dot = address.indexOf('.');
  if (dot === -1) return { head: stripBrackets(address), perEntry: address.endsWith('[]'), tail: null };
  const before = address.slice(0, dot);
  return { head: stripBrackets(before), perEntry: before.endsWith('[]'), tail: address.slice(dot + 1) };
}

function stripBrackets(segment: string): string {
  return segment.endsWith('[]') ? segment.slice(0, -2) : segment;
}

function isMapping(value: FrontmatterValue | undefined): value is FrontmatterMapping {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Every instance an address reaches.
 *
 * A container that is the wrong shape for the address yields NO instances
 * rather than a violation: `generated.by` over `generated: "a string"` is the
 * shape mismatch a container constraint reports, not something the tail
 * constraint should invent an opinion about.
 */
export function instances(frontmatter: Frontmatter, address: FieldAddress): readonly Instance[] {
  // A document with no frontmatter block is a document all of whose keys are
  // absent, so it takes no arm of its own: `key in map` is false, top-level
  // fields still report MISSING, and every nested address finds no container
  // and goes quiet exactly as it does under `{}`.
  const map = frontmatter ?? {};
  const { head: key, perEntry, tail } = parse(address);
  const container = map[key];

  if (tail === null) return [{ at: key, value: key in map ? container : undefined }];

  if (perEntry) {
    if (!Array.isArray(container)) return [];
    return container.map((entry, index) => ({
      at: `${key}[${index}].${tail}`,
      value: isMapping(entry) ? entry[tail] : undefined,
    }));
  }

  if (!isMapping(container)) return [];
  return [{ at: `${key}.${tail}`, value: container[tail] }];
}
