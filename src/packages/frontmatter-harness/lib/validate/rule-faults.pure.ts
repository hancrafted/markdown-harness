/**
 * Validate one rule.
 *
 * Every rule is a selector plus a reason plus a payload, and this file states
 * what each of those three owes.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import type { FrontmatterRule, NoFrontmatterPayload, UnknownKeys } from '../../section.types.ts';
import { assessBlockFaults, unfireableAssessFaults } from './assess-faults.pure.ts';
import { constraintFaults } from './constraint-faults.pure.ts';
import { validateRuleSelector } from './selector-faults.pure.ts';

/**
 * Every key a rule may carry, keyed by the type that declares them.
 */
const RULE_KEYS: Record<keyof FrontmatterRule, true> = {
  ruleId: true,
  folders: true,
  folderTrees: true,
  fileNames: true,
  excludeFiles: true,
  intent: true,
  frontmatter: true,
  fields: true,
  unknownKeys: true,
  exactlyOneOf: true,
  anyOf: true,
  allOf: true,
  assess: true,
};

/**
 * What `frontmatter: forbidden` excludes — each asserts something about
 * frontmatter that must not exist.
 */
const PAYLOAD_KEYS: Record<Exclude<keyof NoFrontmatterPayload, 'frontmatter'>, true> = {
  fields: true,
  unknownKeys: true,
  exactlyOneOf: true,
  anyOf: true,
  allOf: true,
  assess: true,
};

/** Keys whose value must be a list of addresses. */
const LIST_KEYS: readonly string[] = ['exactlyOneOf', 'anyOf', 'allOf'];

/**
 * The two spellings of `unknownKeys` (§3.3), of which `allowed` is the default.
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

function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function misnamesUnknownKeys(rule: Record<string, unknown>): boolean {
  if (!('unknownKeys' in rule)) return false;
  const written = rule.unknownKeys;
  return typeof written !== 'string' || !Object.hasOwn(UNKNOWN_KEYS_STATES, written);
}

/**
 * Keys whose written shape is wrong, reported at the key as written.
 */
function shapeFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const lists = LIST_KEYS.filter((key) => key in rule && !isStringList(rule[key])).map((key) =>
    invalid(`${at}.${key}`),
  );
  const frontmatter = 'frontmatter' in rule && rule.frontmatter !== 'forbidden' ? [invalid(`${at}.frontmatter`)] : [];
  const unknownKeys = misnamesUnknownKeys(rule) ? [invalid(`${at}.unknownKeys`)] : [];
  return [...lists, ...frontmatter, ...unknownKeys];
}

/** `frontmatter: forbidden` is exclusive of every payload key. */
function payloadFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  if (rule.frontmatter !== 'forbidden') return [];
  if (!Object.keys(PAYLOAD_KEYS).some((key) => key in rule)) return [];
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
 * @param moduleAssess The value written under `frontmatter.assess:`, if any.
 */
export function ruleFaults(rule: unknown, at: string, moduleAssess: unknown): readonly ConfigFault[] {
  if (!isMapping(rule)) return [invalid(at)];

  return [
    ...Object.keys(rule)
      .filter((key) => !Object.hasOwn(RULE_KEYS, key))
      .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${key}` })),
    ...identityFaults(rule, at),
    ...validateRuleSelector(rule, at),
    ...shapeFaults(rule, at),
    ...payloadFaults(rule, at),
    ...fieldsFaults(rule, at),
    ...assessBlockFaults(rule.assess, `${at}.assess`),
    ...unfireableAssessFaults(rule, at, moduleAssess),
  ];
}
