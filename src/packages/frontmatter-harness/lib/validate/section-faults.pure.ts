/**
 * Validate the `frontmatter:` section as a whole.
 *
 * This is the Module's half of §3.5's catalog. The loader owns the four faults
 * that name the file; everything from here down names a key inside it, which is
 * why the section arrives as an opaque value rather than as a parsed config —
 * a loader that knew the rule language would have to be edited to gain a second
 * Module.
 */

import type { FrontmatterConfig } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';
import { ruleFaults } from './rule-faults.pure.ts';

/** The section's own address. */
const SECTION = 'frontmatter';
const RULES = `${SECTION}.rules`;

/**
 * Every key the section defines, keyed by the type that defines them.
 *
 * `Record<keyof T, true>` rather than a list of strings, because the narrowing
 * in `./section-narrowing.pure` claims that a section carrying no fault is a
 * section of this type — and that claim is worth exactly what this vocabulary
 * covers. Keyed, a key added to `FrontmatterConfig` and forgotten here leaves a
 * missing entry and will not compile, so the claim cannot quietly decay into a
 * cast wearing a predicate's clothes.
 *
 * Membership is `Object.hasOwn` and never `in`, which walks the prototype chain
 * and would answer true for `toString`.
 */
const SECTION_KEYS: Record<keyof FrontmatterConfig, true> = { rules: true };

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * One fault per id already claimed by an earlier rule.
 *
 * The fault points at the LATER occurrence: the first rule to claim a name is
 * not the mistake, and reporting it there would send the Operator to the rule
 * they meant to keep.
 */
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
 * An absent section and an empty list are the same mistake reported the same
 * way: a config naming no module governs nothing, and the Operator's fix is the
 * same sentence either way.
 *
 * @param section The value written under `frontmatter:`, or `undefined` if the key was never written.
 */
export function sectionFaults(section: unknown): readonly ConfigFault[] {
  if (section === undefined) return [{ code: 'CONFIG_EMPTY_RULE_LIST', location: RULES }];
  if (!isMapping(section)) return [{ code: 'CONFIG_INVALID_VALUE', location: SECTION }];

  const unrecognised = Object.keys(section)
    .filter((key) => !Object.hasOwn(SECTION_KEYS, key))
    .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${SECTION}.${key}` }));

  const rules = section.rules;
  if (rules === undefined) return [...unrecognised, { code: 'CONFIG_EMPTY_RULE_LIST', location: RULES }];
  if (!Array.isArray(rules)) return [...unrecognised, { code: 'CONFIG_INVALID_VALUE', location: RULES }];
  if (rules.length === 0) return [...unrecognised, { code: 'CONFIG_EMPTY_RULE_LIST', location: RULES }];

  return [
    ...unrecognised,
    ...duplicateIdFaults(rules),
    ...rules.flatMap((rule, index) => ruleFaults(rule, `${RULES}[${index}]`)),
  ];
}
