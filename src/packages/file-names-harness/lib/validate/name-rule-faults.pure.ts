/**
 * What is wrong with the `file-names:` section and the rules inside it.
 *
 * The loader owns the four faults that name the config FILE; everything from
 * the `file-names:` key down is decided here. The section arrives as an opaque
 * value, because a loader that understood a Module's rule language would have
 * to be edited every time a Module was added.
 *
 * Both key vocabularies are written as `Record<keyof T, true>`, which is the
 * mechanism rather than the style: a key added to the config contract stops
 * this file compiling until the validator learns to check it. A bare array
 * would let a new key through silently, validated by nothing.
 */

import type { FileNameRule, FileNamesConfig } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';
import { subjectFaults } from './name-subject-faults.pure.ts';

/** This Module's top-level config key, and the prefix every location carries. */
const SECTION = 'file-names';

/** Every key the section may carry. No Module-wide default block has earned a place yet. */
const SECTION_KEYS: Record<keyof FileNamesConfig, true> = { rules: true };

/**
 * Every key one rule may carry.
 *
 * `fileName` is absent, so writing one is an unrecognised key rather than a
 * quiet no-op. That is the enforcement half of withholding the sugar: without
 * it, an Operator who wrote `fileName: log.md` here would get a rule that
 * selects nothing and reports nothing, which is indistinguishable from a
 * corpus that passes.
 */
const RULE_KEYS: Record<keyof FileNameRule, true> = {
  ruleId: true,
  intent: true,
  excludeFiles: true,
  path: true,
  file: true,
};

function invalid(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGlobList(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((glob) => typeof glob === 'string' && glob !== '');
}

/** Keys outside a tier's vocabulary, each reported at its own location. */
function unknownKeys(block: Record<string, unknown>, known: Record<string, true>, at: string): ConfigFault[] {
  return Object.keys(block)
    .filter((key) => !(key in known))
    .map((key) => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${key}` }) as const);
}

/** The mandatory name and the mandatory reason. */
function identityFaults(rule: Record<string, unknown>, at: string): ConfigFault[] {
  const faults: ConfigFault[] = [];

  if (typeof rule.ruleId !== 'string' || rule.ruleId === '') faults.push(invalid(`${at}.ruleId`));

  if (!('intent' in rule)) faults.push({ code: 'CONFIG_MISSING_RULE_INTENT', location: at });
  else if (typeof rule.intent !== 'string' || rule.intent === '') {
    faults.push({ code: 'CONFIG_EMPTY_INTENT', location: `${at}.intent` });
  }
  return faults;
}

/**
 * The selector, and the payload it is useless without.
 *
 * `path` is the only selector this Module offers, so its absence is
 * `CONFIG_SELECTOR_MISSING` rather than the frontmatter Module's
 * `CONFIG_SELECTOR_AMBIGUOUS` — there is no second selector to be ambiguous
 * with.
 */
function payloadFaults(rule: Record<string, unknown>, at: string): ConfigFault[] {
  const faults: ConfigFault[] = [];

  if (!('path' in rule)) faults.push({ code: 'CONFIG_SELECTOR_MISSING', location: at });
  else if (!isGlobList(rule.path)) faults.push(invalid(`${at}.path`));

  if ('excludeFiles' in rule && !isGlobList(rule.excludeFiles)) faults.push(invalid(`${at}.excludeFiles`));

  if (!('file' in rule)) faults.push({ code: 'CONFIG_EMPTY_CONSTRAINT', location: at });
  else faults.push(...subjectFaults(rule.file, `${at}.file`));

  return faults;
}

/** One rule, at its own indexed location. */
function ruleFaults(rule: unknown, at: string): ConfigFault[] {
  if (!isMapping(rule)) return [invalid(at)];

  return [...unknownKeys(rule, RULE_KEYS, at), ...identityFaults(rule, at), ...payloadFaults(rule, at)];
}

/**
 * Two rules claiming one name, reported at the LATER occurrence.
 *
 * The first rule to claim a name is not the mistake, and pointing at it would
 * send an Operator to edit the one that was already right.
 */
function duplicateIdFaults(rules: readonly unknown[], at: string): ConfigFault[] {
  const ids = rules.map((rule) => (isMapping(rule) ? rule.ruleId : undefined));

  return ids.flatMap((id, index) => {
    if (id === undefined || ids.indexOf(id) === index) return [];
    return [{ code: 'CONFIG_DUPLICATE_RULE_ID', location: `${at}[${index}].ruleId` } as const];
  });
}

/**
 * Everything wrong with this Module's whole section.
 *
 * An empty list is a config error rather than an inert Module: a section
 * declaring no rules is almost always a half-finished edit, and treating it as
 * "governs nothing" would make the two indistinguishable.
 *
 * @param section The value written under `file-names:`, or `undefined` if the
 * key was never written.
 */
export function sectionFaults(section: unknown): ConfigFault[] {
  if (section === undefined) return [];
  if (!isMapping(section)) return [invalid(SECTION)];

  const faults = unknownKeys(section, SECTION_KEYS, SECTION);
  const rules = section.rules;
  const at = `${SECTION}.rules`;

  if (!Array.isArray(rules)) return [...faults, invalid(at)];
  if (rules.length === 0) return [...faults, { code: 'CONFIG_EMPTY_RULE_LIST', location: at }];

  return [
    ...faults,
    ...duplicateIdFaults(rules, at),
    ...rules.flatMap((rule, index) => ruleFaults(rule, `${at}[${index}]`)),
  ];
}
