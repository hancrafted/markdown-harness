/**
 * Validate the Rule-level `vocabulary:` key: a list of `{ level, allowed }`
 * items, one per heading level, each a set of exact titles (design-ADR 0027,
 * 0029).
 *
 * Walk order, so two implementations agree: the list's own shape and
 * emptiness; every repeated level across the whole list, at the later item;
 * then each item in index order: unrecognised keys, `level`, `allowed` (its
 * shape, its emptiness, each invalid title in index order, then each repeated
 * title), a level beyond the Rule's `maxLevel`, a level an entry is written at.
 * The two repeats and both cross-key checks are decided over valid values
 * only, so one mistake is reported once.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import { invalidValue, unrecognisedKeys } from '../../../foundation/selector-faults.ts';
import { isMapping } from '../../../foundation/yaml-document.ts';
import type { VocabularyItem } from '../../section.ts';
import { closesSpine } from '../section/spine-closure.pure.ts';
import { fault } from './fault.pure.ts';
import { isLevel } from './template-faults.pure.ts';

/** Every key a vocabulary item may carry, keyed by the type declaring them so the two cannot drift. */
const ITEM_KEYS: Record<keyof VocabularyItem, true> = { level: true, allowed: true };

/** A title: a non-empty string with no leading or trailing whitespace, since a heading's content never has either and such a title could never match. */
function isTitle(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && value === value.trim();
}

/** What the cross-key checks read of the Rule, decided once. */
interface RuleContext {
  /** The Rule's `maxLevel` when it is valid and in force: not beside `forbid`, where it is already refused. */
  maxLevel: number | undefined;
  /** The valid levels some `headings:` entry is written at. */
  entryLevels: ReadonlySet<number>;
}

/** The valid levels written by `headings:` entries, reading a malformed list as no entries. */
function entryLevelsOf(rule: Record<string, unknown>): ReadonlySet<number> {
  const entries: readonly unknown[] = Array.isArray(rule.headings) ? rule.headings : [];
  return new Set(entries.flatMap((entry) => (isMapping(entry) && isLevel(entry.level) ? [entry.level] : [])));
}

/** The level repeated across the list, at the later item, over valid levels only. */
function repeatedLevelFaults(items: readonly unknown[], at: string): readonly ConfigFault[] {
  const seen = new Set<number>();
  return items.flatMap((item, index) => {
    if (!isMapping(item) || !isLevel(item.level)) return [];
    const repeated = seen.has(item.level);
    seen.add(item.level);
    return repeated ? [fault('CONFIG_DUPLICATE_VOCABULARY_LEVEL', `${at}.vocabulary[${index}].level`)] : [];
  });
}

/** The titles of one `allowed` list: invalid ones, then repeated ones over the valid. */
function titleFaults(titles: readonly unknown[], at: string): readonly ConfigFault[] {
  const invalid = titles.flatMap((title, index) => (isTitle(title) ? [] : [invalidValue(`${at}.allowed[${index}]`)]));
  const seen = new Set<string>();
  const repeated = titles.flatMap((title, index) => {
    if (!isTitle(title)) return [];
    const again = seen.has(title);
    seen.add(title);
    return again ? [fault('CONFIG_DUPLICATE_VOCABULARY_TITLE', `${at}.allowed[${index}]`)] : [];
  });
  return [...invalid, ...repeated];
}

/** An item's `allowed`: its shape, its emptiness, then its titles. */
function allowedFaults(item: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const written = item.allowed;
  if (!Array.isArray(written)) return [invalidValue(`${at}.allowed`)];
  if (written.length === 0) return [fault('CONFIG_EMPTY_CONSTRAINT', `${at}.allowed`)];
  return titleFaults(written, at);
}

/** The two cross-key checks of one item with a valid level, each raised at the item's `level`. */
function crossKeyFaults(item: Record<string, unknown>, at: string, context: RuleContext): readonly ConfigFault[] {
  const { level } = item;
  if (!isLevel(level)) return [];
  return [
    ...(context.maxLevel !== undefined && level > context.maxLevel
      ? [fault('CONFIG_VOCABULARY_BEYOND_MAX_LEVEL', `${at}.level`)]
      : []),
    ...(context.entryLevels.has(level) ? [fault('CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES', `${at}.level`)] : []),
  ];
}

/** One item, in walk order. */
function itemFaults(item: unknown, at: string, context: RuleContext): readonly ConfigFault[] {
  if (!isMapping(item)) return [invalidValue(at)];
  return [
    ...unrecognisedKeys(item, ITEM_KEYS, at),
    ...(isLevel(item.level) ? [] : [invalidValue(`${at}.level`)]),
    ...allowedFaults(item, at),
    ...crossKeyFaults(item, at, context),
  ];
}

/**
 * Every fault one Rule's `vocabulary:` carries.
 *
 * `maxLevel` is consulted only when it is valid and the spine is open: beside
 * `undefinedHeadings: forbid` it is already refused and names a limit not in
 * force (design-ADR 0026, 0029).
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address, e.g. `body-structure.rules[0]`.
 */
export function vocabularyFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (!('vocabulary' in rule)) return [];
  const items = rule.vocabulary;
  if (!Array.isArray(items)) return [invalidValue(`${at}.vocabulary`)];
  if (items.length === 0) return [fault('CONFIG_EMPTY_CONSTRAINT', `${at}.vocabulary`)];

  const context: RuleContext = {
    maxLevel: isLevel(rule.maxLevel) && !closesSpine(rule) ? rule.maxLevel : undefined,
    entryLevels: entryLevelsOf(rule),
  };
  return [
    ...repeatedLevelFaults(items, at),
    ...items.flatMap((item, index) => itemFaults(item, `${at}.vocabulary[${index}]`, context)),
  ];
}
