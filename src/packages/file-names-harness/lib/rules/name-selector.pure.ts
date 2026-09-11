/**
 * Which files a single naming rule claims, and which rule wins.
 *
 * First-match, top-down, exactly as the frontmatter Module resolves — but over
 * THIS Module's own rule list. The two lists never rank each other: there is no
 * precedence dimension between Modules, which is the refusal this whole design
 * is built around, and one file simply has up to one winner per Module.
 *
 * One difference from the frontmatter Module's resolver, and it is a decision
 * rather than an omission: there is NO `fileName` sugar. Selecting a file by its
 * exact name while constraining that same name is self-defeating — the rule
 * would reach only the files that already satisfy it, so every misnamed file
 * falls through unselected and the Module reports nothing at all.
 */

import type { FileNameRule } from '../../../config-contract/index.ts';
import type { GlobMatcher } from './name-rules.types.ts';

/**
 * Whether this rule claims this path.
 *
 * Exclusion wins outright and takes no part in ordering: it answers one yes/no
 * question before any rule is chosen, which is what lets a file fall THROUGH to
 * a later, broader rule without restating that rule's constraints.
 *
 * @param rule The rule under test.
 * @param path A normalised, repo-root-relative path.
 * @param matches The glob matcher to decide with.
 */
export function ruleSelects(rule: FileNameRule, path: string, matches: GlobMatcher): boolean {
  const matched = rule.path.some((glob) => matches(glob, path));
  if (!matched) return false;

  return !(rule.excludeFiles ?? []).some((glob) => matches(glob, path));
}

/**
 * The naming rule that wins for this path, or nothing if this Module passes it by.
 *
 * `undefined` is a claim about this Module's whole rule list rather than a null
 * rule. The path may still be governed — by the frontmatter Module — which is
 * exactly why `invisible` is now a claim about every Module at once and can no
 * longer be decided here.
 *
 * @param path A normalised, repo-root-relative path.
 * @param rules The ordered rule list, in the order the Operator wrote it.
 * @param matches The glob matcher to decide with.
 */
export function findFirstNameRule(
  path: string,
  rules: readonly FileNameRule[],
  matches: GlobMatcher,
): FileNameRule | undefined {
  return rules.find((rule) => ruleSelects(rule, path, matches));
}
