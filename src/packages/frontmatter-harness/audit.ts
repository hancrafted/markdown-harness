// How every rule fared across one corpus.
//
// `--audit` resolves rules against PATHS and never opens a file, which is why
// this takes a file list rather than a root: enumeration belongs to
// `markdown-file-tree`, and keeping it out of here is what lets the walker's
// refusals be proven before frontmatter parsing can confuse a failure.
//
// It takes the paths and deliberately not a governed subset. "Governed" is
// per-Module, and `shadowed` needs every rule that selected each file rather
// than only the winner — a subset would have thrown that away upstream.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { normalisePath } from '../markdown-file-tree/normalise-path.ts';
import type { AuditResult } from '../response-contract/index.ts';
import { tallyRules } from './lib/audit/rule-tally.pure.ts';
import { matchGlob } from './lib/rules/glob-match.impure.ts';

/**
 * Tally the config's ordered rule list across a corpus.
 *
 * @param files The corpus, as root-relative paths in walker order.
 * @param config A config that has already been validated.
 */
export function auditRules(files: readonly string[], config: MarkdownHarnessConfig): AuditResult {
  const normalised = files.map(normalisePath);
  return { rules: tallyRules(normalised, config.frontmatter?.rules ?? [], matchGlob) };
}
