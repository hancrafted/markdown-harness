/**
 * Which rule governs a path — first match wins, nothing merges, nothing
 * inherited (tenet 5).
 */

import type { FrontmatterRule, Glob } from '../../../contract/config.ts';
import type { RepoPath } from '../../../contract/corpus.ts';
import { matches } from '../../glob.ts';

/** The rule that won, and where it sits. Positional: rule identity IS its index. */
export interface Winner {
  index: number;
  rule: FrontmatterRule;
}

/**
 * A rule's selectors, as globs.
 *
 * `fileName: "log.md"` desugars to `path: ["**\/log.md"]`, so everything is a
 * path glob underneath and precedence stays one-dimensional.
 */
export function selectors(rule: FrontmatterRule): readonly Glob[] {
  return rule.fileName === undefined ? (rule.path ?? []) : [`**/${rule.fileName}`];
}

/**
 * Exclusion wins within a rule and takes no part in ordering: it answers one
 * yes/no question BEFORE that rule can win, which is what lets an excluded file
 * fall through to a later, broader rule.
 */
function governs(rule: FrontmatterRule, path: RepoPath): boolean {
  if (rule.excludeFiles?.some((glob) => matches(path, glob))) return false;
  return selectors(rule).some((glob) => matches(path, glob));
}

/** The first matching rule, or `null` — and `null` means invisible, not unconstrained. */
export function winner(rules: readonly FrontmatterRule[], path: RepoPath): Winner | null {
  for (const [index, rule] of rules.entries()) {
    if (governs(rule, path)) return { index, rule };
  }
  return null;
}
