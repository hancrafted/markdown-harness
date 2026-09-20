// How every rule fared across one corpus.
//
// `--audit` resolves rules against PATHS and never opens a file, which is why
// this takes a file list rather than a root: enumeration belongs to
// `foundation`, and keeping it out of here is what lets the walker's
// refusals be proven before frontmatter parsing can confuse a failure.
//
// It takes the paths and deliberately not a governed subset. "Governed" is
// per-Module, and `shadowed` needs every rule that selected each file rather
// than only the winner — a subset would have thrown that away upstream.

import type { AuditResult } from '../response-contract/index.ts';
import { tallyRules } from './lib/audit/rule-tally.pure.ts';
import { normalisePath } from './lib/rules/path-shape.pure.ts';
import type { FrontmatterConfig } from './section.types.ts';

/**
 * Tally the frontmatter module's ordered rule list across a corpus.
 *
 * @param files The corpus, as root-relative paths in walker order.
 * @param section A frontmatter section that has already been validated, or undefined.
 */
export function auditRules(files: readonly string[], section: FrontmatterConfig | undefined): AuditResult {
  const normalised = files.map(normalisePath);
  return { rules: tallyRules(normalised, section?.rules ?? []) };
}
