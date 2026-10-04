/**
 * Validate the `body-structure:` section as a whole (design-ADR 0020).
 *
 * The loader owns the faults that name the config FILE and orders every
 * Module's faults by the declared Module set; everything from the
 * `body-structure` key down is decided here. A config fails whole, so every
 * fault is collected rather than the first.
 *
 * Walk order. Within the section: unrecognised keys, an empty `rules`,
 * duplicate `ruleId`s across the whole list, then each Rule in turn. Within a
 * Rule, mirroring the first Module: unrecognised keys, `ruleId`, `intent`, a
 * missing selector, each axis's shape, `excludeFiles`, the Rule-level empty
 * payload, `maxLevel`, then `headings`.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import { isMapping } from '../../../foundation/yaml-document.ts';
import type { BodyStructureConfig, BodyStructureRule } from '../../section.ts';
import { invalidValue, unrecognisedKeys } from './config-fault.pure.ts';
import { axisFaults, exclusionFaults, selectorMissingFaults } from './selector-faults.pure.ts';
import { headingsFaults, intentFaults, maxLevelFaults } from './template-faults.pure.ts';

/** The section's own address. */
const SECTION = 'body-structure';
const RULES = `${SECTION}.rules`;

/** Every key the section defines, keyed by the type defining them so a key added there cannot be forgotten here. */
const SECTION_KEYS: Record<keyof BodyStructureConfig, true> = { rules: true };

/** Every key a Rule may carry, keyed by the type declaring them. `maxDepth`, `levels`, `title` and `prefix` are deliberately absent. */
const RULE_KEYS: Record<keyof BodyStructureRule, true> = {
  ruleId: true,
  intent: true,
  folders: true,
  fileNames: true,
  types: true,
  excludeFiles: true,
  maxLevel: true,
  headings: true,
};

/** The Rule's name and reason, both mandatory, each with its own way of being absent. */
function identityFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const named = typeof rule.ruleId === 'string' && rule.ruleId !== '';
  return [
    ...(named ? [] : [invalidValue(`${at}.ruleId`)]),
    ...('intent' in rule ? intentFaults(rule, at) : [{ code: 'CONFIG_MISSING_RULE_INTENT', location: at } as const]),
  ];
}

/** A Rule that writes neither `headings` nor `maxLevel` asks nothing of a body. An empty list is reported at the list instead. */
function payloadFaults(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  return 'maxLevel' in rule || 'headings' in rule ? [] : [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: at }];
}

/** Every fault one Rule carries, in walk order. */
function ruleFaults(rule: unknown, at: string): readonly ConfigFault[] {
  if (!isMapping(rule)) return [invalidValue(at)];
  return [
    ...unrecognisedKeys(rule, RULE_KEYS, at),
    ...identityFaults(rule, at),
    ...selectorMissingFaults(rule, at),
    ...axisFaults(rule, at),
    ...exclusionFaults(rule, at),
    ...payloadFaults(rule, at),
    ...maxLevelFaults(rule, at),
    ...headingsFaults(rule, at),
  ];
}

/** One fault per id an earlier Rule already claimed, pointing at the LATER occurrence. */
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
 * Every fault the `body-structure:` section carries.
 *
 * @param section The value written under `body-structure:`, whatever it parsed to.
 */
export function sectionFaults(section: unknown): readonly ConfigFault[] {
  if (!isMapping(section)) return [invalidValue(SECTION)];

  const keys = unrecognisedKeys(section, SECTION_KEYS, SECTION);
  const rules = section.rules;
  if (rules === undefined) return [...keys, { code: 'CONFIG_EMPTY_RULE_LIST', location: RULES }];
  if (!Array.isArray(rules)) return [...keys, invalidValue(RULES)];
  if (rules.length === 0) return [...keys, { code: 'CONFIG_EMPTY_RULE_LIST', location: RULES }];

  return [
    ...keys,
    ...duplicateIdFaults(rules),
    ...rules.flatMap((rule, index) => ruleFaults(rule, `${RULES}[${index}]`)),
  ];
}

/**
 * Whether a section carries no fault, and so IS this Module's section.
 *
 * The claim is worth exactly what the walk above covers, which is why every
 * vocabulary it checks against is keyed by the type it narrows to.
 *
 * @param section The value written under `body-structure:`.
 */
export function isBodyStructureConfig(section: unknown): section is BodyStructureConfig {
  return sectionFaults(section).length === 0;
}
