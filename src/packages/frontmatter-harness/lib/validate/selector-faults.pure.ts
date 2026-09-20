/**
 * Validation for rule selectors and exclusion selectors (design-ADR 0007).
 *
 * A selector is two literal axes: folders and file names, and carries no glob.
 * At least one of `folders`, `folderTrees`, `fileNames` is required.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';

const WILDCARD_REGEX = /[*?[\]{}]/;

const SELECTOR_KEYS = ['folders', 'folderTrees', 'fileNames'] as const;
const EXCLUDE_KEYS = [...SELECTOR_KEYS] as const;

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

function isValidFolderToken(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  if (!token.endsWith('/')) return false;
  if (WILDCARD_REGEX.test(token)) return false;
  return true;
}

function isValidFileNameToken(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  if (token.includes('/')) return false;
  if (WILDCARD_REGEX.test(token)) return false;
  return true;
}

function folderListFaults(value: unknown, location: string): readonly ConfigFault[] {
  if (!Array.isArray(value) || value.length === 0) return [invalid(location)];
  for (const token of value) {
    if (!isValidFolderToken(token)) return [invalid(location)];
  }
  return [];
}

function fileNameListFaults(value: unknown, location: string): readonly ConfigFault[] {
  if (!Array.isArray(value) || value.length === 0) return [invalid(location)];
  for (const token of value) {
    if (!isValidFileNameToken(token)) return [invalid(location)];
  }
  return [];
}

function excludeItemFaults(item: unknown, at: string): readonly ConfigFault[] {
  if (!isMapping(item)) return [invalid(at)];

  const unrecognised = Object.keys(item)
    .filter((k) => !(EXCLUDE_KEYS as readonly string[]).includes(k))
    .map((k): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${k}` }));

  const hasSelectorKey = SELECTOR_KEYS.some((k) => k in item);
  if (!hasSelectorKey) {
    return [...unrecognised, { code: 'CONFIG_SELECTOR_MISSING', location: at }];
  }

  const faults: ConfigFault[] = [...unrecognised];
  if ('folders' in item) faults.push(...folderListFaults(item.folders, `${at}.folders`));
  if ('folderTrees' in item) faults.push(...folderListFaults(item.folderTrees, `${at}.folderTrees`));
  if ('fileNames' in item) faults.push(...fileNameListFaults(item.fileNames, `${at}.fileNames`));
  return faults;
}

/**
 * Validate a rule's selector keys and excludeFiles list.
 *
 * @param rule The rule object from YAML.
 * @param at The rule's address in config notation.
 */
export function validateRuleSelector(rule: Record<string, unknown>, at: string): readonly ConfigFault[] {
  const hasSelectorKey = SELECTOR_KEYS.some((k) => k in rule);
  if (!hasSelectorKey) {
    return [{ code: 'CONFIG_SELECTOR_MISSING', location: at }];
  }

  const faults: ConfigFault[] = [];
  if ('folders' in rule) faults.push(...folderListFaults(rule.folders, `${at}.folders`));
  if ('folderTrees' in rule) faults.push(...folderListFaults(rule.folderTrees, `${at}.folderTrees`));
  if ('fileNames' in rule) faults.push(...fileNameListFaults(rule.fileNames, `${at}.fileNames`));

  if ('excludeFiles' in rule) {
    const excludes = rule.excludeFiles;
    if (!Array.isArray(excludes)) {
      faults.push(invalid(`${at}.excludeFiles`));
    } else {
      excludes.forEach((item, index) => {
        faults.push(...excludeItemFaults(item, `${at}.excludeFiles[${index}]`));
      });
    }
  }

  return faults;
}
