/**
 * Validate the heading Constraints of one Rule: its `maxLevel:` and its `headings:`
 * spine, at every depth: a nested `headings:` list is the same grammar as the
 * Rule's own, validated by the same walk, and each of its entries must sit
 * deeper than its parent.
 *
 * What a `purpose` allows decides most of it. A `heading` may never carry a
 * count, an `enumeration` may never carry `presence`, must carry at least one
 * count, and may never pin one fixed text. A missing or unknown `purpose` is one
 * fault and silences every purpose-dependent check for that entry, so one
 * mistake is reported once.
 *
 * Walk order within an entry, so two implementations agree: unrecognised keys,
 * `purpose`, `level`, `pattern`, `allowed`, `pattern` beside `allowed`, the keys
 * the purpose forbids (`minCount`, `maxCount`, then `presence`), `presence`,
 * `minCount`, `maxCount`, inverted bounds, a missing count, an anchored-literal
 * pattern, `intent`, `mayHold`, a level beyond the Rule's `maxLevel`, a level not
 * deeper than the parent entry's, then the nested `headings:` list.
 *
 * An empty `pattern` would match every heading at its level and a pattern that
 * does not compile under the `u` flag could never fire: both are
 * `CONFIG_INVALID_VALUE`, a key written with a value outside its declared type.
 */

import { intentFaults } from '../../../foundation/intent-faults.ts';
import { invalidValue, unrecognisedKeys } from '../../../foundation/selector-faults.ts';
import { isMapping } from '../../../foundation/yaml-document.ts';
import type { HeadingEntry, HeadingPurpose } from '../../section.ts';
import { closesSpine } from '../section/spine-closure.pure.ts';
import { allowedFaults, writesAllowedList } from './allowed-faults.pure.ts';
import { mayHoldFaults } from './block-kind-faults.pure.ts';
import { fault } from './fault.pure.ts';
import type { BodyStructureFault } from './fault.types.ts';
import { isPattern } from './pattern-dialect.pure.ts';
import { purposeFaultsFor } from './purpose-faults.pure.ts';

/** Every key a heading entry may carry, keyed by the type declaring them so the two cannot drift. */
const HEADING_KEYS: Record<keyof HeadingEntry, true> = {
  purpose: true,
  level: true,
  pattern: true,
  allowed: true,
  presence: true,
  minCount: true,
  maxCount: true,
  mayHold: true,
  intent: true,
  headings: true,
};

/** The two purposes, keyed by the union they shadow. */
const PURPOSES: Record<HeadingPurpose, true> = { heading: true, enumeration: true };

/** An integer from 1 to 6: a heading level, or the deepest level a Rule permits. */
export function isLevel(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 6;
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
  return 'pattern' in entry && !isPattern(entry.pattern) ? [invalidValue(`${at}.pattern`)] : [];
}

/** A valid `pattern` beside a non-empty `allowed` list, raised at `allowed`: an entry names its title one way. */
function patternWithAllowedFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  return isPattern(entry.pattern) && writesAllowedList(entry)
    ? [fault('CONFIG_PATTERN_WITH_ALLOWED', `${at}.allowed`)]
    : [];
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

/** What an entry's checks read beyond the entry itself: the Rule's `maxLevel` in force, and the parent entry's level. */
interface EntryContext {
  /** The Rule's `maxLevel` when valid and in force; `undefined` otherwise. */
  maxLevel: number | undefined;
  /** The parent entry's valid level; `undefined` at the top level or when the parent's level is invalid. */
  parentLevel: number | undefined;
}

/** A valid nested entry level no deeper than its parent's valid level: a heading inside the parent's section never sits there. */
function notDeeperFaults(
  entry: Record<string, unknown>,
  at: string,
  parentLevel: number | undefined,
): readonly BodyStructureFault[] {
  if (parentLevel === undefined || !isLevel(entry.level) || entry.level > parentLevel) return [];
  return [fault('CONFIG_NESTED_ENTRY_NOT_DEEPER', `${at}.level`)];
}

/** One heading entry, in walk order, its nested list last. */
function headingEntryFaults(
  entry: Record<string, unknown>,
  at: string,
  context: EntryContext,
): readonly BodyStructureFault[] {
  return [
    ...unrecognisedKeys(entry, HEADING_KEYS, at),
    ...purposeFaults(entry, at),
    ...levelFaults(entry, at),
    ...patternFaults(entry, at),
    ...allowedFaults(entry, at),
    ...patternWithAllowedFaults(entry, at),
    ...(isPurpose(entry.purpose) ? purposeFaultsFor(entry, entry.purpose, at) : []),
    ...intentFaults(entry, at),
    ...mayHoldFaults(entry, at),
    ...beyondMaxLevelFaults(entry, at, context.maxLevel),
    ...notDeeperFaults(entry, at, context.parentLevel),
    ...listFaults(entry, at, {
      maxLevel: context.maxLevel,
      parentLevel: isLevel(entry.level) ? entry.level : undefined,
    }),
  ];
}

/** One `headings:` list, the Rule's own or an entry's nested one: its shape, its emptiness, then each entry. */
function listFaults(
  carrier: Record<string, unknown>,
  at: string,
  context: EntryContext,
): readonly BodyStructureFault[] {
  if (!('headings' in carrier)) return [];
  const headings = carrier.headings;
  if (!Array.isArray(headings)) return [invalidValue(`${at}.headings`)];
  if (headings.length === 0) return [fault('CONFIG_EMPTY_CONSTRAINT', `${at}.headings`)];
  return headings.flatMap((entry, index) => {
    const location = `${at}.headings[${index}]`;
    return isMapping(entry) ? headingEntryFaults(entry, location, context) : [invalidValue(location)];
  });
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
 * Every fault in one Rule's `headings:` list, at every depth.
 *
 * An entry deeper than the Rule's `maxLevel` is a spine no file can satisfy,
 * decided only when `maxLevel` and the entry's own `level` are both valid, and
 * not at all beside `undefinedHeadings: forbid`, where `maxLevel` is already
 * refused and names a limit not in force.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address, e.g. `body-structure.rules[0]`.
 */
export function headingsFaults(rule: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  const maxLevel = isLevel(rule.maxLevel) && !closesSpine(rule) ? rule.maxLevel : undefined;
  return listFaults(rule, at, { maxLevel, parentLevel: undefined });
}
