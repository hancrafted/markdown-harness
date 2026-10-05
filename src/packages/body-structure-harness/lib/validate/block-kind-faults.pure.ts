/**
 * Validate the `mayHold:` key of one heading entry: the kinds of block its
 * section may hold.
 *
 * Decided whatever the entry's `purpose` is, because what a section may hold
 * depends on neither the purpose, the level nor the pattern, so an invalid
 * `purpose` does not silence it. Walk order: the key's shape, its emptiness,
 * each element outside the three kinds in index order, then each repeated kind,
 * decided over valid kinds only so one mistake is reported once.
 */

import { invalidValue } from '../../../foundation/selector-faults.ts';
import type { BlockKind } from '../../section.ts';
import { fault } from './fault.pure.ts';
import type { BodyStructureFault } from './fault.types.ts';

/** The three kinds, keyed by the union they shadow so a kind added there cannot be forgotten here. */
const BLOCK_KINDS: Record<BlockKind, true> = { prose: true, 'ordered-list': true, 'unordered-list': true };

/** Whether a value is one of the three spellings. */
function isBlockKind(value: unknown): value is BlockKind {
  return typeof value === 'string' && Object.hasOwn(BLOCK_KINDS, value);
}

/** One fault per element that is no kind, at the element. */
function invalidKindFaults(kinds: readonly unknown[], at: string): readonly BodyStructureFault[] {
  return kinds.flatMap((kind, index) => (isBlockKind(kind) ? [] : [invalidValue(`${at}.mayHold[${index}]`)]));
}

/** One fault per kind an earlier valid element already holds, at the later one. */
function repeatedKindFaults(kinds: readonly unknown[], at: string): readonly BodyStructureFault[] {
  const seen = new Set<unknown>();
  return kinds.flatMap((kind, index) => {
    if (!isBlockKind(kind)) return [];
    const repeated = seen.has(kind);
    seen.add(kind);
    return repeated ? [fault('CONFIG_DUPLICATE_BLOCK_KIND', `${at}.mayHold[${index}]`)] : [];
  });
}

/**
 * Every fault one entry's `mayHold` carries.
 *
 * @param entry One heading entry, straight off the YAML.
 * @param at The entry's address, e.g. `body-structure.rules[0].headings[1]`.
 */
export function mayHoldFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  if (!('mayHold' in entry)) return [];
  const written = entry.mayHold;
  if (!Array.isArray(written)) return [invalidValue(`${at}.mayHold`)];
  if (written.length === 0) return [fault('CONFIG_EMPTY_CONSTRAINT', `${at}.mayHold`)];
  return [...invalidKindFaults(written, at), ...repeatedKindFaults(written, at)];
}
