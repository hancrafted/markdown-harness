/**
 * What one field address reaches in one file's frontmatter.
 *
 * The address language reaches exactly one level into nested shapes, and the
 * whole of the difficulty is what a CONTAINER does to the address below it. An
 * absent list makes a per-entry constraint vacuous; a list that is really a
 * string makes the same constraint a shape collision. Those are opposite
 * findings — one silent, one reported, and addressed to different people — so
 * the two are decided here rather than left to each constraint.
 */

import type { AddressResolution, AddressSite, FrontmatterMapping } from './check.types.ts';

/** The list marker, OKF's own notation: `sources[].resource`. */
const ENTRY_MARKER = '[].';

/** The mapping separator: `generated.by`. */
const KEY_SEPARATOR = '.';

/** A mapping, for the purpose of reaching a key inside it. */
function isMapping(value: unknown): value is FrontmatterMapping {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A container that was never really written.
 *
 * `undefined` is the key's absence and `null` is a key written with nothing
 * after it. Both mean there is nothing below to address, and neither is the
 * Operator's mistake — which is what keeps them out of `shape-mismatch`.
 */
function isUnwritten(value: unknown): boolean {
  return value === undefined || value === null;
}

/** One leaf lookup inside a mapping, reported at the address as it will be printed. */
function siteIn(container: FrontmatterMapping, leaf: string, field: string): AddressSite {
  const present = Object.hasOwn(container, leaf);
  return { field, present, value: present ? container[leaf] : undefined };
}

/** Every entry of a list, each at its own indexed address. */
function sitesAcross(entries: readonly unknown[], leaf: string, container: string): AddressResolution {
  const sites = entries.map((entry, index) => {
    const field = `${container}[${index}].${leaf}`;
    // A list of scalars where the config expected records addresses nothing,
    // rather than colliding: the repair is to write the key, which is the
    // author's edit and what `MISSING_REQUIRED_FIELD` asks for.
    if (!isMapping(entry)) return { field, present: false, value: undefined };
    return siteIn(entry, leaf, field);
  });
  return { kind: 'sites', sites };
}

/**
 * Resolve one written address against one file's frontmatter.
 *
 * @param address The address exactly as the config wrote it.
 * @param data The file's parsed frontmatter mapping.
 */
export function resolveAddress(address: string, data: FrontmatterMapping): AddressResolution {
  const entryAt = address.indexOf(ENTRY_MARKER);
  if (entryAt !== -1) {
    const container = address.slice(0, entryAt);
    const leaf = address.slice(entryAt + ENTRY_MARKER.length);
    const held = data[container];
    if (isUnwritten(held)) return { kind: 'vacuous' };
    if (!Array.isArray(held)) return { kind: 'shape-mismatch' };
    return sitesAcross(held, leaf, container);
  }

  const keyAt = address.indexOf(KEY_SEPARATOR);
  if (keyAt === -1) return { kind: 'sites', sites: [siteIn(data, address, address)] };

  const container = address.slice(0, keyAt);
  const leaf = address.slice(keyAt + KEY_SEPARATOR.length);
  const held = data[container];
  if (isUnwritten(held)) return { kind: 'sites', sites: [{ field: address, present: false, value: undefined }] };
  if (!isMapping(held)) return { kind: 'shape-mismatch' };
  return { kind: 'sites', sites: [siteIn(held, leaf, address)] };
}
