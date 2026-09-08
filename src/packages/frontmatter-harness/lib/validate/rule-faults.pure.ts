/**
 * Validate one rule.
 *
 * Every rule is a selector plus a reason plus a payload, and this file states
 * what each of those three owes. The two exclusivity rules the config language
 * models in its types are re-checked here, because a config arrives as YAML and
 * a type guarantees nothing about what was actually written.
 */

import type { UnknownKeys } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';
import { constraintFaults } from './constraint-faults.pure.ts';

/** Every key a rule may carry. */
const RULE_KEYS: readonly string[] = [
  'ruleId',
  'path',
  'fileName',
  'excludeFiles',
  'intent',
  'frontmatter',
  'fields',
  'unknownKeys',
  'exactlyOneOf',
  'anyOf',
  'allOf',
];

/** What `frontmatter: forbidden` excludes — each asserts something about frontmatter that must not exist. */
const PAYLOAD_KEYS: readonly string[] = ['fields', 'unknownKeys', 'exactlyOneOf', 'anyOf', 'allOf'];

/** Keys whose value must be a list of globs or addresses. */
const LIST_KEYS: readonly string[] = ['path', 'excludeFiles', 'exactlyOneOf', 'anyOf', 'allOf'];

/**
 * The two spellings of `unknownKeys` (§3.3), of which `allowed` is the default.
 *
 * Keyed by the union it shadows, so widening `UnknownKeys` and forgetting this
 * file cannot compile. A type union is erased before this runs, so a runtime
 * check needs a shadow, and keying it is what stops the two drifting apart.
 */
const UNKNOWN_KEYS_STATES: Record<UnknownKeys, true> = { allowed: true, forbidden: true };

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

/** The rule's own name and reason, both mandatory, each with its own way of being absent. */
function identityFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const faults: ConfigFault[] = [];
  if (typeof rule.ruleId !== 'string' || rule.ruleId === '') faults.push(invalid(`${at}.ruleId`));
  if (!('intent' in rule)) faults.push({ code: 'CONFIG_MISSING_RULE_INTENT', location: at });
  else if (!rule.intent) faults.push({ code: 'CONFIG_EMPTY_INTENT', location: `${at}.intent` });
  return faults;
}

/** Exactly one of `path` / `fileName`. Neither and both are separate mistakes. */
function selectorFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const count = ['path', 'fileName'].filter((key) => key in rule).length;
  if (count === 1) return [];
  return [{ code: count === 0 ? 'CONFIG_SELECTOR_MISSING' : 'CONFIG_SELECTOR_AMBIGUOUS', location: at }];
}

/**
 * A list of strings, which is what every list-valued key holds.
 *
 * The elements are checked and not merely the container: a non-string glob
 * reaches the matcher as something it cannot match, and §3.5 line 271 puts a
 * cross-field set of the wrong shape under `CONFIG_INVALID_VALUE`.
 *
 * An empty list is a list of strings. It names no addresses, which is a
 * different thing from naming a wrong one.
 */
function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * Whether a written `unknownKeys` names neither of its two spellings.
 *
 * The evaluator branches on `forbidden` alone, so every other spelling would
 * otherwise read as the permissive default rather than as the mistake it is.
 *
 * Membership is `Object.hasOwn` and never `in`: `in` walks the prototype chain,
 * so `unknownKeys: toString` would answer true and pass straight through the
 * check that exists to stop it.
 */
function misnamesUnknownKeys(rule: Record<string, unknown>): boolean {
  if (!('unknownKeys' in rule)) return false;
  const written = rule.unknownKeys;
  return typeof written !== 'string' || !Object.hasOwn(UNKNOWN_KEYS_STATES, written);
}

/**
 * Keys whose written shape is wrong, reported at the key as written.
 *
 * The location is the key and never the offending index, which §3.5 fixes: one
 * bad element makes the whole list unusable, so an indexed fault would ask for
 * the same repair once per element.
 */
function shapeFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const lists = LIST_KEYS.filter((key) => key in rule && !isStringList(rule[key])).map((key) =>
    invalid(`${at}.${key}`),
  );
  const fileName = 'fileName' in rule && typeof rule.fileName !== 'string' ? [invalid(`${at}.fileName`)] : [];
  const frontmatter = 'frontmatter' in rule && rule.frontmatter !== 'forbidden' ? [invalid(`${at}.frontmatter`)] : [];
  const unknownKeys = misnamesUnknownKeys(rule) ? [invalid(`${at}.unknownKeys`)] : [];
  return [...lists, ...fileName, ...frontmatter, ...unknownKeys];
}

/** `frontmatter: forbidden` is exclusive of every payload key. */
function payloadFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (rule.frontmatter !== 'forbidden') return [];
  if (!PAYLOAD_KEYS.some((key) => key in rule)) return [];
  return [{ code: 'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD', location: at }];
}

/** Each field address, delegated to the constraint tier. */
function fieldsFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (!('fields' in rule)) return [];
  if (!isMapping(rule.fields)) return [invalid(`${at}.fields`)];
  return Object.entries(rule.fields).flatMap(([address, constraint]) =>
    constraintFaults(constraint, `${at}.fields.${address}`),
  );
}

/**
 * Every fault one rule carries.
 *
 * @param rule One entry of the ordered rule list, straight off the YAML.
 * @param at The rule's address in the config's own notation, e.g. `frontmatter.rules[3]`.
 */
export function ruleFaults(rule: unknown, at: string): readonly ConfigFault[] {
  if (!isMapping(rule)) return [invalid(at)];

  return [
    ...Object.keys(rule)
      .filter((key) => !RULE_KEYS.includes(key))
      .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${key}` })),
    ...identityFaults(rule, at),
    ...selectorFaults(rule, at),
    ...shapeFaults(rule, at),
    ...payloadFaults(rule, at),
    ...fieldsFaults(rule, at),
  ];
}
