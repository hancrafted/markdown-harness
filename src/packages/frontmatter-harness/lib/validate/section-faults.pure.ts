/**
 * Validate the `frontmatter:` section as a whole.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import type { FrontmatterConfig } from '../../section.types.ts';
import { assessBlockFaults } from './assess-faults.pure.ts';
import { ruleFaults } from './rule-faults.pure.ts';

const SECTION = 'frontmatter';
const RULES = `${SECTION}.rules`;
const ASSESS = `${SECTION}.assess`;

const SECTION_KEYS: Record<keyof FrontmatterConfig, true> = { rules: true, assess: true };

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function duplicateIdFaults(rules: readonly unknown[]): readonly ConfigFault[] {
  const claimed = new Set<string>();
  const faults: ConfigFault[] = [];
  rules.forEach((rule, index) => {
    if (!isMapping(rule) || typeof rule.ruleId !== 'string') return;
    if (claimed.has(rule.ruleId))
      faults.push({ code: 'CONFIG_DUPLICATE_RULE_ID', location: `${RULES}[${index}].ruleId` });
    claimed.add(rule.ruleId);
  });
  return faults;
}

/**
 * Every fault the `frontmatter:` section carries.
 *
 * An absent section produces no faults for this module (the loader raises
 * CONFIG_NO_MODULE_SECTION if all modules are absent).
 * An empty rules list raises CONFIG_EMPTY_RULE_LIST.
 *
 * @param section The value written under `frontmatter:`, or `undefined` if the key was never written.
 */
export function sectionFaults(section: unknown): readonly ConfigFault[] {
  if (section === undefined) return [];
  if (!isMapping(section)) return [{ code: 'CONFIG_INVALID_VALUE', location: SECTION }];

  const unrecognised = Object.keys(section)
    .filter((key) => !Object.hasOwn(SECTION_KEYS, key))
    .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${SECTION}.${key}` }));

  const assess = assessBlockFaults(section.assess, ASSESS);

  const rules = section.rules;
  if (rules === undefined) return [...unrecognised, ...assess, { code: 'CONFIG_EMPTY_RULE_LIST', location: RULES }];
  if (!Array.isArray(rules)) return [...unrecognised, ...assess, { code: 'CONFIG_INVALID_VALUE', location: RULES }];
  if (rules.length === 0) return [...unrecognised, ...assess, { code: 'CONFIG_EMPTY_RULE_LIST', location: RULES }];

  return [
    ...unrecognised,
    ...assess,
    ...duplicateIdFaults(rules),
    ...rules.flatMap((rule, index) => ruleFaults(rule, `${RULES}[${index}]`, section.assess)),
  ];
}
