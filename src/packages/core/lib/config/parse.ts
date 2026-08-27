/**
 * Reading the config text into rules.
 *
 * Private to `core`: the config file is the Core's to own, and each Module is
 * handed its own section rather than the file.
 */

import { parse } from 'yaml';
import type { FrontmatterRule, MarkdownHarnessConfig } from '../../../contract/config.ts';

/** The rule list, in the order the Operator wrote it. Order is load-bearing: first match wins. */
export function readRules(configText: string): readonly FrontmatterRule[] {
  const config = parse(configText) as MarkdownHarnessConfig | null;
  return config?.frontmatter?.rules ?? [];
}
