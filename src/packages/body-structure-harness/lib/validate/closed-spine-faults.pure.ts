/**
 * Validate the two keys that close a spine: `undefinedHeadings:` and its
 * exclusion of `maxLevel:`.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import { invalidValue } from '../../../foundation/selector-faults.ts';
import type { UndefinedHeadings } from '../../section.ts';
import { closesSpine } from '../section/spine-closure.pure.ts';
import { isLevel } from './template-faults.pure.ts';

/** The two spellings of `undefinedHeadings`, keyed by the union they shadow. */
const UNDEFINED_HEADINGS: Record<UndefinedHeadings, true> = { allow: true, forbid: true };

/** Whether `undefinedHeadings` is one of its two spellings. */
function isUndefinedHeadings(value: unknown): value is UndefinedHeadings {
  return typeof value === 'string' && Object.hasOwn(UNDEFINED_HEADINGS, value);
}

/**
 * An `undefinedHeadings` that is not `allow` or `forbid`, reported at the key:
 * any other string, a boolean, a list, a number, or the key written with nothing
 * after it.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address, e.g. `body-structure.rules[0]`.
 */
export function undefinedHeadingsFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  return 'undefinedHeadings' in rule && !isUndefinedHeadings(rule.undefinedHeadings)
    ? [invalidValue(`${at}.undefinedHeadings`)]
    : [];
}

/**
 * A `maxLevel` written beside `undefinedHeadings: forbid`, reported at
 * `maxLevel`, the redundant half. Decided only when both keys
 * are valid, so one mistake is reported once.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address, e.g. `body-structure.rules[0]`.
 */
export function closedSpineFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  return isLevel(rule.maxLevel) && closesSpine(rule)
    ? [{ code: 'CONFIG_MAX_LEVEL_ON_CLOSED_SPINE', location: `${at}.maxLevel` }]
    : [];
}
