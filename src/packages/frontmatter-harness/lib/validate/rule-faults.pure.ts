/**
 * Validate one rule.
 *
 * Every rule is a selector plus a reason plus a payload, and this file states
 * what each of those three owes. The two exclusivity rules the config language
 * models in its types are re-checked here, because a config arrives as YAML and
 * a type guarantees nothing about what was actually written.
 */

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

/** Keys whose written shape is wrong, reported at the key as written. */
function shapeFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const lists = LIST_KEYS.filter((key) => key in rule && !Array.isArray(rule[key])).map((key) =>
    invalid(`${at}.${key}`),
  );
  const fileName = 'fileName' in rule && typeof rule.fileName !== 'string' ? [invalid(`${at}.fileName`)] : [];
  const frontmatter = 'frontmatter' in rule && rule.frontmatter !== 'forbidden' ? [invalid(`${at}.frontmatter`)] : [];
  return [...lists, ...fileName, ...frontmatter];
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
