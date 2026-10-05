/**
 * Validate the `allowed:` key of one heading entry: a non-empty list of
 * `{ title, intent? }` items, the exact titles a matching heading may take.
 *
 * Walk order, so two implementations agree: the list's own shape and
 * emptiness; then each item in index order: its shape, unrecognised keys, its
 * `title`, its `intent`; then each title an earlier item already holds, at the
 * later item's `title`, decided over valid titles only so one mistake is
 * reported once.
 */

import { intentFaults } from '../../../foundation/intent-faults.ts';
import { invalidValue, unrecognisedKeys } from '../../../foundation/selector-faults.ts';
import { isMapping } from '../../../foundation/yaml-document.ts';
import type { AllowedTitle } from '../../section.ts';
import { fault } from './fault.pure.ts';
import type { BodyStructureFault } from './fault.types.ts';

/** Every key an `allowed` item may carry, keyed by the type declaring them so the two cannot drift. */
const ITEM_KEYS: Record<keyof AllowedTitle, true> = { title: true, intent: true };

/** A title: a non-empty string with no leading or trailing whitespace, since a heading's content never has either and such a title could never match. */
function isTitle(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && value === value.trim();
}

/** The valid title of one item, when it has one. */
function titleOf(item: unknown): string | undefined {
  return isMapping(item) && isTitle(item.title) ? item.title : undefined;
}

/** One item, in walk order. */
function itemFaults(item: unknown, at: string): readonly BodyStructureFault[] {
  if (!isMapping(item)) return [invalidValue(at)];
  return [
    ...unrecognisedKeys(item, ITEM_KEYS, at),
    ...(isTitle(item.title) ? [] : [invalidValue(`${at}.title`)]),
    ...intentFaults(item, at),
  ];
}

/** One fault per title an earlier valid item already holds, at the later item's `title`. */
function repeatedTitleFaults(items: readonly unknown[], at: string): readonly BodyStructureFault[] {
  const seen = new Set<string>();
  return items.flatMap((item, index) => {
    const title = titleOf(item);
    if (title === undefined) return [];
    const again = seen.has(title);
    seen.add(title);
    return again ? [fault('CONFIG_DUPLICATE_VOCABULARY_TITLE', `${at}.allowed[${index}].title`)] : [];
  });
}

/**
 * Whether an entry's `allowed` is a non-empty list, whatever its items hold:
 * the half of the `pattern`/`allowed` exclusion this key decides.
 *
 * @param entry One heading entry, straight off the YAML.
 */
export function writesAllowedList(entry: Record<string, unknown>): boolean {
  return Array.isArray(entry.allowed) && entry.allowed.length > 0;
}

/**
 * Every fault one entry's `allowed` carries.
 *
 * @param entry One heading entry, straight off the YAML.
 * @param at The entry's address, e.g. `body-structure.rules[0].headings[1]`.
 */
export function allowedFaults(entry: Record<string, unknown>, at: string): readonly BodyStructureFault[] {
  if (!('allowed' in entry)) return [];
  const items = entry.allowed;
  if (!Array.isArray(items)) return [invalidValue(`${at}.allowed`)];
  if (items.length === 0) return [fault('CONFIG_EMPTY_CONSTRAINT', `${at}.allowed`)];
  return [
    ...items.flatMap((item, index) => itemFaults(item, `${at}.allowed[${index}]`)),
    ...repeatedTitleFaults(items, at),
  ];
}
