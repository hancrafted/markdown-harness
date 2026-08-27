/**
 * Reading the config text into rules.
 *
 * Private to `core`: the config file is the Core's to own, and each Module is
 * handed its own section rather than the file.
 */

import { parse } from 'yaml';
import type { ConfigRejected } from '../../../contract/config-rejected.ts';
import type { FrontmatterRule, MarkdownHarnessConfig } from '../../../contract/config.ts';

/** The rule list, in the order the Operator wrote it. Order is load-bearing: first match wins. */
export function readRules(configText: string): readonly FrontmatterRule[] {
  const config = parse(configText) as MarkdownHarnessConfig | null;
  return config?.frontmatter?.rules ?? [];
}

/**
 * A config naming a module and then governing nothing.
 *
 * Built here rather than at each entry point so `check` and `query` reject the
 * same config the same way. A fresh object every call: this is handed straight
 * back to a caller, and a shared literal is a caller's to mutate.
 */
export function emptyRuleList(): ConfigRejected {
  return { report: 'config-rejected', faults: [{ code: 'empty-rule-list', at: 'frontmatter.rules' }] };
}
