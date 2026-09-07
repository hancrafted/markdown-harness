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
import type { GlobMatcher, RuleSelection } from './rules.types.ts';

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
 * What this rule did with this path.
 *
 * Exclusion still wins outright, but the globs are asked FIRST so that the two
 * ways of not selecting stay distinguishable: `excluded` means this rule's own
 * globs reached the file and its own `excludeFiles` took it back, while
 * `unselected` means the rule never reached it at all. `--audit` reports the
 * two differently, and only this function knows which is which.
 *
 * Exclusion takes no part in ordering — it answers one yes/no question before
 * any rule is chosen, which is what lets a file fall THROUGH to a later,
 * broader rule without restating that rule's constraints. That is also why an
 * `excluded` verdict is a fact about one rule alone and never about the list.
 *
 * @param rule The rule under test.
 * @param path A normalised, repo-root-relative path.
 * @param matches The glob matcher to decide with.
 */
export function selectionFor(rule: FrontmatterRule, path: string, matches: GlobMatcher): RuleSelection {
  const matched = globsForRule(rule).some((glob) => matches(glob, path));
  if (!matched) return 'unselected';

  const excluded = (rule.excludeFiles ?? []).some((glob) => matches(glob, path));
  return excluded ? 'excluded' : 'selected';
}

/**
 * Whether this rule claims this path.
 *
 * Defined in terms of `selectionFor` rather than beside it, so that the
 * resolver `--query` and `--check` run on and the tallies `--audit` reports
 * cannot drift apart about what selecting means. A diagnostic that explained
 * first-match using its own second opinion would be worse than none.
 *
 * @param rule The rule under test.
 * @param path A normalised, repo-root-relative path.
 * @param matches The glob matcher to decide with.
 */
export function ruleSelects(rule: FrontmatterRule, path: string, matches: GlobMatcher): boolean {
  return selectionFor(rule, path, matches) === 'selected';
}
