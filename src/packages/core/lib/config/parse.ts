/**
 * Reading the config text into rules, and refusing the ones that describe
 * nothing.
 *
 * Private to `core`: the config file is the Core's to own, and each Module is
 * handed its own section rather than the file.
 */

import { parse } from 'yaml';
import type { ConfigErrorResult, ConfigFault } from '../../../contract/config-error.ts';
import { CONFIG_FAULT } from '../../../contract/config-error.ts';
import type { FrontmatterRule } from '../../../contract/config.ts';

/** The rule list, in the order the Operator wrote it. Order is load-bearing: first match wins. */
export function readRules(configText: string): readonly FrontmatterRule[] {
  const config = parse(configText) as MarkdownHarnessConfigText;
  return config?.frontmatter?.rules ?? [];
}

type MarkdownHarnessConfigText = { frontmatter?: { rules?: FrontmatterRule[] } } | null;

/**
 * Every reason to refuse this config, or nothing.
 *
 * One function so `check`, `query` and `coverage` refuse the same config the
 * same way — three entry points validating independently would be three chances
 * to disagree about whether a config is usable.
 *
 * ALL faults, not the first. An Operator fixing a config wants the list.
 */
export function configFaults(rules: readonly FrontmatterRule[]): readonly ConfigFault[] {
  if (rules.length === 0) {
    return [{ code: CONFIG_FAULT.EMPTY_RULE_LIST, location: 'frontmatter.rules' }];
  }
  return rules.flatMap((rule, index) => unexplainedPatterns(rule, index));
}

/**
 * `pattern` without its mandatory sibling `intent`.
 *
 * The address is positional because it is a place in a file the Operator has
 * open, not a reference to a rule that has to survive an insertion above it —
 * see `ConfigAddress`.
 */
function unexplainedPatterns(rule: FrontmatterRule, index: number): readonly ConfigFault[] {
  return Object.entries(rule.fields ?? {})
    .filter(([, constraints]) => constraints.pattern !== undefined && constraints.intent === undefined)
    .map(([address]) => ({
      code: CONFIG_FAULT.MISSING_PATTERN_INTENT,
      location: `frontmatter.rules[${index}].fields.${address}.pattern`,
    }));
}

/**
 * A fresh object every call: this is handed straight back to a caller, and a
 * shared literal is a caller's to mutate.
 */
export function rejected(faults: readonly ConfigFault[]): ConfigErrorResult {
  return { error: 'CONFIG_REJECTED', faults };
}
