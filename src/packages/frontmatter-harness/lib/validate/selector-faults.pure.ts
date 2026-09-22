/**
 * Validate the selector half of one rule: the two axes, their tokens, and the
 * exclusions written in the same vocabulary.
 *
 * Its own file rather than a section of `rule-faults.pure.ts`, because the
 * selector is the one part of a rule that is not about frontmatter at all. It
 * is the config language's way of naming files, it is what a second Module
 * would reach for unchanged, and it is the half this repository just rewrote —
 * so a reviewer reading the grammar reads one file rather than picking it out
 * of the rule vocabulary around it.
 *
 * Every fault here points at the KEY as written and never at an offending
 * index. One bad token makes the whole axis unusable, so an indexed fault would
 * ask for the same repair once per element.
 */

import { isFileNameToken, isFolderToken } from '../../../foundation/selector-grammar.ts';
import { isMapping } from '../../../foundation/yaml-document.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';

/** The two axes, named once so the presence checks and the token checks agree. */
const SELECTOR_AXES: readonly string[] = ['folders', 'fileNames'];

function isMappingList(value: unknown): value is readonly Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isMapping);
}
function invalid(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

/**
 * A list of strings, which is what a selector axis holds — and, unchanged
 * elsewhere in a rule, what every other list-valued key holds too.
 *
 * The elements are checked and not merely the container: a non-string token
 * reaches the selector as something it can never equal, and §3.5 line 271 puts
 * a cross-field set of the wrong shape under `CONFIG_INVALID_VALUE`.
 *
 * An empty list is a list of strings. It names no folders, no names and no
 * addresses — a different thing from naming a wrong one, and a different
 * thing again from leaving the key out, which on a selector axis means every.
 */
export function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * At least one of `folders` / `fileNames`.
 *
 * Both together is no longer a mistake — it is the intersection, and the way an
 * exact path is spelled. So the old ambiguity has nothing left to report and
 * `CONFIG_SELECTOR_MISSING` is the only selector fault there is, redefined from
 * "neither `path` nor `fileName`" to "neither axis".
 *
 * A rule carrying neither selects nothing and governs nothing. Without a fault
 * an Operator gets a green run over a rule that never fires, and reads
 * compliance out of its absence.
 *
 * @param rule One entry of the rule list, straight off the YAML.
 * @param at The rule's address in the config's own notation.
 */
export function selectorFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (SELECTOR_AXES.some((axis) => axis in rule)) return [];
  return [{ code: 'CONFIG_SELECTOR_MISSING', location: at }];
}

/**
 * Tokens the axis vocabulary refuses, reported at the axis.
 *
 * Only lists that already read as lists of strings are examined, so a wrongly
 * shaped axis earns one fault rather than two.
 *
 * @param selector A rule or an exclusion, straight off the YAML.
 * @param at The address whose `.folders` / `.fileNames` are being reported.
 */
export function tokenFaults(selector: Record<string, unknown>, at: string): readonly ConfigFault[] {
  return SELECTOR_AXES.filter((axis) => {
    const written = selector[axis];
    if (!isStringList(written)) return false;
    const wellFormed = axis === 'folders' ? isFolderToken : isFileNameToken;
    return (written as readonly string[]).some((token) => !wellFormed(token));
  }).map((axis) => invalid(`${at}.${axis}`));
}

function unrecognisedExclusionFaults(
  exclusions: readonly Record<string, unknown>[],
  location: string,
): readonly ConfigFault[] {
  const unrecognisedKeys = [
    ...new Set(exclusions.flatMap((entry) => Object.keys(entry).filter((key) => !SELECTOR_AXES.includes(key)))),
  ];
  return unrecognisedKeys.map((key) => ({
    code: 'CONFIG_UNRECOGNISED_KEY',
    location: `${location}.${key}`,
  }));
}

/**
 * Exclusions, held to the same vocabulary and the same at-least-one rule.
 *
 * One language rather than two, which is why this delegates to the same token
 * checks an include axis gets. Every fault points at `excludeFiles` rather than
 * at an entry: an exclusion list reads as one statement about what this rule
 * gives back, and a reader repairing it opens the whole key. A key an exclusion
 * does not define is `CONFIG_UNRECOGNISED_KEY` naming the key as written rather
 * than an offending index, so an exclusion list with several entries carrying
 * the same misspelling earns one fault rather than one per entry.
 *
 * @param rule One entry of the rule list, straight off the YAML.
 * @param at The rule's address in the config's own notation.
 */
function exclusionEntryFaults(
  exclusions: readonly Record<string, unknown>[],
  location: string,
  at: string,
): readonly ConfigFault[] {
  const unrecognised = unrecognisedExclusionFaults(exclusions, location);
  if (unrecognised.length > 0) return unrecognised;

  const misshapen = exclusions.some((exclusion) =>
    SELECTOR_AXES.some((axis) => axis in exclusion && !isStringList(exclusion[axis])),
  );
  if (misshapen) return [invalid(location)];

  const axisless = exclusions.some((exclusion) => !SELECTOR_AXES.some((axis) => axis in exclusion));
  if (axisless) return [{ code: 'CONFIG_SELECTOR_MISSING', location }];

  const malformed = exclusions.some((exclusion) => tokenFaults(exclusion, at).length > 0);
  return malformed ? [invalid(location)] : [];
}

/**
 * Exclusions, held to the same vocabulary and the same at-least-one rule.
 *
 * One language rather than two, which is why this delegates to the same token
 * checks an include axis gets. Every fault points at `excludeFiles` rather than
 * at an entry: an exclusion list reads as one statement about what this rule
 * gives back, and a reader repairing it opens the whole key. A key an exclusion
 * does not define is `CONFIG_UNRECOGNISED_KEY` naming the key as written rather
 * than an offending index, so an exclusion list with several entries carrying
 * the same misspelling earns one fault rather than one per entry.
 *
 * @param rule One entry of the rule list, straight off the YAML.
 * @param at The rule's address in the config's own notation.
 */
export function exclusionFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (!('excludeFiles' in rule)) return [];
  const written = rule.excludeFiles;
  const location = `${at}.excludeFiles`;
  if (!isMappingList(written)) return [invalid(location)];
  return exclusionEntryFaults(written, location, at);
}
