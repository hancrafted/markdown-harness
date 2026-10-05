/**
 * Validate the selector half of one Rule on Core's two literal axes, and the
 * two fault shapes every section validator raises.
 *
 * Both Modules validate the same selector language, so an Operator writing both
 * sections meets one language and one fault order. A Module with an axis of its
 * own (`types`) passes it in as `extraAxes`: its name for the
 * presence check, and the token test for its list. The Core never names it, so
 * the selector stays two axes (design-ADR 0007).
 *
 * The token grammar is Core's (`selector-grammar.pure.ts`), so a token validated
 * here is one the matcher can reach. Every fault points at the KEY as written
 * and never at an offending index: one bad token makes the whole axis unusable,
 * so an indexed fault would ask for the same repair once per element.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import { isFileNameToken, isFolderToken } from '../tree/selector-grammar.pure.ts';
import { isMapping } from '../yaml/yaml-mapping.pure.ts';

/** How a Module's own list axis judges its tokens; `true` means every token is admitted. */
type ExtraAxes = Readonly<Record<string, (tokens: readonly string[]) => boolean>>;

/** Core's two literal axes, the only keys an exclusion may carry. */
const PATH_AXES: readonly string[] = ['folders', 'fileNames'];

/**
 * A key written with a value outside its declared type.
 *
 * @param location The address of the key, e.g. `body-structure.rules[0].levels`.
 */
export function invalidValue(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

/**
 * One fault per key the mapping writes outside its vocabulary, in the order
 * written. Only the vocabulary's OWN keys count, so a key every object
 * inherits is still refused.
 *
 * @param written A mapping straight off the YAML.
 * @param known The vocabulary, keyed by the type declaring it.
 * @param at The mapping's address.
 */
export function unrecognisedKeys(written: Record<string, unknown>, known: object, at: string): readonly ConfigFault[] {
  return Object.keys(written)
    .filter((key) => !Object.hasOwn(known, key))
    .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${key}` }));
}

/**
 * A list of strings, the elements checked and not merely the container. An
 * empty list is a list of strings: it names nothing wrong, and is a different
 * thing from leaving the key out, which on a selector axis means every.
 */
export function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/** Whether every token of one axis is one its grammar admits. */
function wellFormed(axis: string, tokens: readonly string[], extraAxes: ExtraAxes): boolean {
  if (axis === 'folders') return tokens.every(isFolderToken);
  if (axis === 'fileNames') return tokens.every(isFileNameToken);
  return extraAxes[axis](tokens);
}

/**
 * At least one axis. A Rule carrying none selects nothing, and a green run over
 * it reads compliance out of absence.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address.
 * @param extraAxes The Module's own axes, which count towards "at least one".
 */
export function selectorMissingFaults(
  rule: Record<string, unknown>,
  at: string,
  extraAxes: ExtraAxes = {},
): readonly ConfigFault[] {
  const axes = [...PATH_AXES, ...Object.keys(extraAxes)];
  return axes.some((axis) => axis in rule) ? [] : [{ code: 'CONFIG_SELECTOR_MISSING', location: at }];
}

/**
 * Tokens an axis refuses, reported at the axis. Only axes that already read as
 * lists of strings are examined, so a wrongly shaped axis earns one fault from
 * whoever reports shape rather than two.
 *
 * @param selector A Rule or an exclusion, straight off the YAML.
 * @param at The address whose axes are being reported.
 * @param extraAxes The Module's own axes, after Core's, in the order given.
 */
export function tokenFaults(
  selector: Record<string, unknown>,
  at: string,
  extraAxes: ExtraAxes = {},
): readonly ConfigFault[] {
  return [...PATH_AXES, ...Object.keys(extraAxes)]
    .filter((axis) => {
      const written = selector[axis];
      return isStringList(written) && !wellFormed(axis, written, extraAxes);
    })
    .map((axis) => invalidValue(`${at}.${axis}`));
}

/**
 * Each written axis that is not a list of well-formed tokens, Core's axes first
 * and then the Module's own: a wrongly shaped axis and a malformed token are
 * one fault at the axis.
 *
 * @param selector A Rule or an exclusion, straight off the YAML.
 * @param at The address whose axes are being reported.
 * @param extraAxes The Module's own axes.
 */
export function axisFaults(
  selector: Record<string, unknown>,
  at: string,
  extraAxes: ExtraAxes = {},
): readonly ConfigFault[] {
  return [...PATH_AXES, ...Object.keys(extraAxes)]
    .filter((axis) => {
      if (!(axis in selector)) return false;
      const written = selector[axis];
      return !isStringList(written) || !wellFormed(axis, written, extraAxes);
    })
    .map((axis) => invalidValue(`${at}.${axis}`));
}

/**
 * The one fault, if any, that an exclusion list's entries earn: an
 * unrecognised key, then a wrongly shaped axis, then an entry with no axis,
 * then a malformed token. The first kind found is the only one reported.
 */
function entryFaults(entries: readonly Record<string, unknown>[], location: string): readonly ConfigFault[] {
  const unknownKeys = [
    ...new Set(entries.flatMap((entry) => Object.keys(entry).filter((key) => !PATH_AXES.includes(key)))),
  ];
  if (unknownKeys.length > 0) {
    return unknownKeys.map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${location}.${key}` }));
  }
  if (entries.some((entry) => PATH_AXES.some((axis) => axis in entry && !isStringList(entry[axis])))) {
    return [invalidValue(location)];
  }
  if (entries.some((entry) => !PATH_AXES.some((axis) => axis in entry))) {
    return [{ code: 'CONFIG_SELECTOR_MISSING', location }];
  }
  return entries.some((entry) => tokenFaults(entry, location).length > 0) ? [invalidValue(location)] : [];
}

/**
 * Exclusions, held to Core's selector: the two path axes only, at least one of
 * them, and the same token grammar. Every fault points at `excludeFiles`, or
 * names the unrecognised key under it once however many entries carry it.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address.
 */
export function exclusionFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (!('excludeFiles' in rule)) return [];
  const location = `${at}.excludeFiles`;
  const written = rule.excludeFiles;
  if (!Array.isArray(written) || !written.every(isMapping)) return [invalidValue(location)];
  return entryFaults(written, location);
}
