/**
 * Which files a single rule claims.
 *
 * Everything is a path glob underneath, so precedence stays one-dimensional and
 * the resolver keeps one code path. The matcher arrives as an argument: a
 * builtin import would make this file reach the platform, and the question it
 * answers — does this rule claim this path — is a rule of the config language
 * rather than a property of the host.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { GlobMatcher } from './rules.types.ts';

/**
 * The globs a rule selects by, with `fileName` desugared.
 *
 * `fileName: "log.md"` becomes `**\/log.md` — a file of that name anywhere,
 * including the repo root.
 *
 * @param rule The rule to read a selector off.
 */
export function globsForRule(rule: FrontmatterRule): readonly string[] {
  return 'fileName' in rule && rule.fileName !== undefined ? [`**/${rule.fileName}`] : (rule.path ?? []);
}

/**
 * Whether this rule claims this path.
 *
 * Exclusion is asked first and wins outright. It takes no part in ordering: it
 * answers one yes/no question before any rule is chosen, which is what lets a
 * file fall THROUGH to a later, broader rule without restating that rule's
 * constraints.
 *
 * @param rule The rule under test.
 * @param path A normalised, repo-root-relative path.
 * @param matches The glob matcher to decide with.
 */
export function ruleSelects(rule: FrontmatterRule, path: string, matches: GlobMatcher): boolean {
  const excluded = (rule.excludeFiles ?? []).some((glob) => matches(glob, path));
  if (excluded) return false;
  return globsForRule(rule).some((glob) => matches(glob, path));
}
