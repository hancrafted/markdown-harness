/**
 * Validate the selector half of one Rule: Core's two literal axes, this
 * Module's own `types` axis, and the exclusions (design-ADR 0020).
 *
 * The token grammar is Core's, reached through `foundation`, so a token this
 * validates is one the matcher can reach. The rest mirrors the first Module's
 * selector rules on purpose — an Operator writing both sections meets one
 * language — and is restated here rather than imported, because one Module may
 * not import another (ARCH-008 §1.1).
 *
 * Every fault points at the KEY as written and never at an offending index:
 * one bad token makes the whole axis unusable.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import { isFileNameToken, isFolderToken } from '../../../foundation/selector-grammar.ts';
import { isMapping } from '../../../foundation/yaml-document.ts';
import { invalidValue } from './config-fault.pure.ts';

/** Core's two literal axes, the only keys an exclusion may carry. */
const PATH_AXES: readonly string[] = ['folders', 'fileNames'];

/** All three axes a Rule may select on. */
const RULE_AXES: readonly string[] = [...PATH_AXES, 'types'];

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/** Whether every token of one axis is one its grammar admits. */
function wellFormed(axis: string, tokens: readonly string[]): boolean {
  if (axis === 'folders') return tokens.every(isFolderToken);
  if (axis === 'fileNames') return tokens.every(isFileNameToken);
  return tokens.length > 0 && tokens.every((token) => token !== '');
}

/**
 * At least one of `folders`, `fileNames` and `types`. A Rule carrying none
 * selects nothing, and a green run over it reads compliance out of absence.
 *
 * @param rule One Rule, straight off the YAML.
 * @param at The Rule's address.
 */
export function selectorMissingFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  return RULE_AXES.some((axis) => axis in rule) ? [] : [{ code: 'CONFIG_SELECTOR_MISSING', location: at }];
}

/**
 * Each written axis that is not a list of well-formed tokens, in the order
 * `folders`, `fileNames`, `types`.
 *
 * A folder token needs its trailing `/`, a file name may carry no separator,
 * and a `type` is any non-empty string in a list of at least one: a Rule that can never win
 * would show in `--query` as a candidate nobody can satisfy (design-ADR 0020).
 *
 * @param selector A Rule or one exclusion, straight off the YAML.
 * @param at The address whose axes are being reported.
 */
export function axisFaults(selector: Record<string, unknown>, at: string): readonly ConfigFault[] {
  return RULE_AXES.filter((axis) => {
    if (!(axis in selector)) return false;
    const written = selector[axis];
    return !isStringList(written) || !wellFormed(axis, written);
  }).map((axis) => invalidValue(`${at}.${axis}`));
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

  const unknownKeys = [
    ...new Set(written.flatMap((entry) => Object.keys(entry).filter((key) => !PATH_AXES.includes(key)))),
  ];
  if (unknownKeys.length > 0) {
    return unknownKeys.map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${location}.${key}` }));
  }
  if (written.some((entry) => !PATH_AXES.some((axis) => axis in entry))) {
    return [{ code: 'CONFIG_SELECTOR_MISSING', location }];
  }
  return written.some((entry) => axisFaults(entry, location).length > 0) ? [invalidValue(location)] : [];
}
