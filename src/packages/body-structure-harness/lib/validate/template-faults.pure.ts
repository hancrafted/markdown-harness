/**
 * Validate the template half of one Rule: its `maxLevel:` and its `headings:`
 * spine.
 *
 * What a `purpose` allows decides most of it. A `heading` may never carry a
 * count, an `enumeration` may never carry `presence`, must carry at least one
 * count, and may never pin one fixed text. A missing or unknown `purpose` is one
 * fault and silences every purpose-dependent check for that entry, so one
 * mistake is reported once.
 *
 * Walk order within an entry, so two implementations agree: unrecognised keys,
 * `purpose`, `level`, `pattern`, the keys the purpose forbids (`minCount`,
 * `maxCount`, then `presence`), `presence`, `minCount`, `maxCount`, inverted
 * bounds, a missing count, an anchored-literal pattern, `intent`, `mayHold`, a level
 * beyond the Rule's `maxLevel`.
 *
 * An empty `pattern` would match every heading at its level and a pattern that
 * does not compile under the `u` flag could never fire: both are
 * `CONFIG_INVALID_VALUE`, a key written with a value outside its declared type.
 */

import { invalidValue, unrecognisedKeys } from '../../../foundation/selector-faults.ts';
import { isMapping } from '../../../foundation/yaml-document.ts';
import type { HeadingEntry, HeadingPresence, HeadingPurpose } from '../../section.ts';
import { closesSpine } from '../section/spine-closure.pure.ts';
import { mayHoldFaults } from './block-kind-faults.pure.ts';
import { fault } from './fault.pure.ts';
import type { BodyStructureFault } from './fault.types.ts';
import { compiles, isAnchoredLiteral } from './pattern-dialect.pure.ts';

/** Every key a heading entry may carry, keyed by the type declaring them so the two cannot drift. */
const HEADING_KEYS: Record<keyof HeadingEntry, true> = {
  purpose: true,
  level: true,
  pattern: true,
  presence: true,
  minCount: true,
  maxCount: true,
  mayHold: true,
  intent: true,
};

/** The two purposes, keyed by the union they shadow. */
const PURPOSES: Record<HeadingPurpose, true> = { heading: true, enumeration: true };

/** The two spellings of `presence`, keyed by the union they shadow. */
const PRESENCE: Record<HeadingPresence, true> = { required: true, optional: true };

/** The smallest value each count admits: `minCount` may be 0, `maxCount` may not. */
const COUNT_FLOORS = { minCount: 0, maxCount: 1 } as const;

/** An integer from 1 to 6: a heading level, or the deepest level a Rule permits. */
export function isLevel(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 6;
}

/** An integer no smaller than `floor`. */
function isCount(value: unknown, floor: number): value is number {
  return Number.isInteger(value) && (value as number) >= floor;
}

/** A string with at least one character. */
function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

/** Whether `purpose` is one of the two spellings. */
function isPurpose(value: unknown): value is HeadingPurpose {
  return typeof value === 'string' && Object.hasOwn(PURPOSES, value);
}

/** A `level` that is not an integer from 1 to 6. */
function levelFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  return isLevel(entry.level) ? [] : [invalidValue(`${at}.level`)];
}

/** A `purpose` that is absent or not one of its two spellings. */
function purposeFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  return isPurpose(entry.purpose) ? [] : [invalidValue(`${at}.purpose`)];
}

/** A `pattern` that is not a non-empty string, or does not compile under the `u` flag. */
function patternFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  if (!('pattern' in entry)) return [];
  const written = entry.pattern;
  return isFilled(written) && compiles(written) ? [] : [invalidValue(`${at}.pattern`)];
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
  if (!isFilled(written) || !compiles(written)) return [];
  return isAnchoredLiteral(written) ? [fault('CONFIG_ENUMERATION_PINS_TEXT', `${at}.pattern`)] : [];
}

/** Every check that depends on a valid `purpose`, in walk order. */
function purposeFaultsFor(
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

/**
 * An `intent` written and left blank — empty, or `intent:` with nothing after
 * it, which parses to null — or written as anything but a string. A Rule's
 * intent and a heading entry's share this, so the two cannot disagree about
 * what blank means; neither is checked here for being absent.
 *
 * @param carrier A Rule or a heading entry, straight off the YAML.
 * @param at The carrier's address.
 */
export function intentFaults(carrier: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  if (!('intent' in carrier)) return [];
  const written = carrier.intent;
  if (written === '' || written === null) return [fault('CONFIG_EMPTY_INTENT', `${at}.intent`)];
  return typeof written === 'string' ? [] : [invalidValue(`${at}.intent`)];
}

/** A valid entry level deeper than the Rule's valid `maxLevel`: an entry no heading can ever match. */
function beyondMaxLevelFaults(
  entry: Record<string, unknown>,
  at: string,
  maxLevel: number | undefined,
): readonly BodyStructureFault[] {
  if (maxLevel === undefined || !isLevel(entry.level) || entry.level <= maxLevel) return [];
  return [fault('CONFIG_ENTRY_BEYOND_MAX_LEVEL', `${at}.level`)];
}

/** One heading entry, in walk order. */
function headingEntryFaults(
  entry: Record<string, unknown>,
  at: string,
  maxLevel: number | undefined,
): readonly BodyStructureFault[] {
  return [
    ...unrecognisedKeys(entry, HEADING_KEYS, at),
    ...purposeFaults(entry, at),
    ...levelFaults(entry, at),
    ...patternFaults(entry, at),
    ...(isPurpose(entry.purpose) ? purposeFaultsFor(entry, entry.purpose, at) : []),
    ...intentFaults(entry, at),
    ...mayHoldFaults(entry, at),
    ...beyondMaxLevelFaults(entry, at, maxLevel),
  ];
}

/**
 * A `maxLevel` that is not an integer from 1 to 6.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address, e.g. `body-structure.rules[0]`.
 */
export function maxLevelFaults(rule: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  return 'maxLevel' in rule && !isLevel(rule.maxLevel) ? [invalidValue(`${at}.maxLevel`)] : [];
}

/**
 * Every fault in one Rule's `headings:` list.
 *
 * An entry deeper than the Rule's `maxLevel` is a template no file can satisfy,
 * decided only when `maxLevel` and the entry's own `level` are both valid, and
 * not at all beside `undefinedHeadings: forbid`, where `maxLevel` is already
 * refused and names a limit not in force.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address, e.g. `body-structure.rules[0]`.
 */
export function headingsFaults(rule: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  if (!('headings' in rule)) return [];
  const headings = rule.headings;
  if (!Array.isArray(headings)) return [invalidValue(`${at}.headings`)];
  if (headings.length === 0) return [fault('CONFIG_EMPTY_CONSTRAINT', `${at}.headings`)];

  const maxLevel = isLevel(rule.maxLevel) && !closesSpine(rule) ? rule.maxLevel : undefined;
  return headings.flatMap((entry, index) => {
    const location = `${at}.headings[${index}]`;
    return isMapping(entry) ? headingEntryFaults(entry, location, maxLevel) : [invalidValue(location)];
  });
}
