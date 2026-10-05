/**
 * Validate what a heading entry's `purpose` decides: a `heading` may never
 * carry a count and may carry `presence`; an `enumeration` may never carry
 * `presence`, must carry at least one count, and may never pin one fixed text.
 * Reached only for a valid `purpose`, so one mistake is reported once.
 */

import { invalidValue } from '../../../foundation/selector-faults.ts';
import type { HeadingEntry, HeadingPresence, HeadingPurpose } from '../../section.ts';
import { fault } from './fault.pure.ts';
import type { BodyStructureFault } from './fault.types.ts';
import { isAnchoredLiteral, isPattern } from './pattern-dialect.pure.ts';

/** The two spellings of `presence`, keyed by the union they shadow. */
const PRESENCE: Record<HeadingPresence, true> = { required: true, optional: true };

/** The smallest value each count admits: `minCount` may be 0, `maxCount` may not. */
const COUNT_FLOORS = { minCount: 0, maxCount: 1 } as const;

/** An integer no smaller than `floor`. */
function isCount(value: unknown, floor: number): value is number {
  return Number.isInteger(value) && (value as number) >= floor;
}

/** The keys one purpose may never carry, in the order they are reported. */
const FORBIDDEN_KEYS: Record<HeadingPurpose, readonly (keyof HeadingEntry)[]> = {
  heading: ['minCount', 'maxCount'],
  enumeration: ['presence'],
};

/** Each key the entry's purpose forbids, reported at the key. */
function forbiddenKeyFaults(
  entry: Record<string, unknown>,
  purpose: HeadingPurpose,
  at: string,
): readonly BodyStructureFault[] {
  return FORBIDDEN_KEYS[purpose]
    .filter((key) => key in entry)
    .map((key) => fault('CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE', `${at}.${key}`));
}

/** A `presence` outside its two spellings. Only a `heading` may write one. */
function presenceFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  if (!('presence' in entry)) return [];
  const written = entry.presence;
  return typeof written === 'string' && Object.hasOwn(PRESENCE, written) ? [] : [invalidValue(`${at}.presence`)];
}

/** A count written outside its type: an integer no smaller than its floor. */
function countFaults(
  entry: Record<string, unknown>,
  key: keyof typeof COUNT_FLOORS,
  at: string,
): readonly BodyStructureFault[] {
  if (!(key in entry) || isCount(entry[key], COUNT_FLOORS[key])) return [];
  return [invalidValue(`${at}.${key}`)];
}

/**
 * `minCount` above `maxCount`, so no count satisfies the entry. Decided only
 * when both bounds are written and valid, so an invalid bound is reported once.
 */
function invertedFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  const { minCount, maxCount } = entry;
  if (!isCount(minCount, COUNT_FLOORS.minCount) || !isCount(maxCount, COUNT_FLOORS.maxCount)) return [];
  return minCount > maxCount ? [fault('CONFIG_COUNT_BOUNDS_INVERTED', at)] : [];
}

/** An enumeration with neither count written: with nothing to count it states nothing. */
function missingCountFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  return 'minCount' in entry || 'maxCount' in entry ? [] : [fault('CONFIG_ENUMERATION_WITHOUT_COUNT', at)];
}

/** An enumeration whose valid pattern can only match one string. */
function pinnedTextFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  const written = entry.pattern;
  if (!isPattern(written)) return [];
  return isAnchoredLiteral(written) ? [fault('CONFIG_ENUMERATION_PINS_TEXT', `${at}.pattern`)] : [];
}

/**
 * Every check that depends on a valid `purpose`, in walk order.
 *
 * @param entry One heading entry, straight off the YAML.
 * @param purpose The entry's valid `purpose`.
 * @param at The entry's address, e.g. `body-structure.rules[0].headings[1]`.
 */
export function purposeFaultsFor(
  entry: Record<string, unknown>,
  purpose: HeadingPurpose,
  at: string,
): readonly BodyStructureFault[] {
  const forbidden = forbiddenKeyFaults(entry, purpose, at);
  if (purpose === 'heading') return [...forbidden, ...presenceFaults(entry, at)];
  return [
    ...forbidden,
    ...countFaults(entry, 'minCount', at),
    ...countFaults(entry, 'maxCount', at),
    ...invertedFaults(entry, at),
    ...missingCountFaults(entry, at),
    ...pinnedTextFaults(entry, at),
  ];
}
