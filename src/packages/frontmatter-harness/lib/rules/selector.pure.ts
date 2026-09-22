/**
 * Which files a single rule claims.
 *
 * Two axes of literal tokens and no wildcard anywhere, so this file needs no
 * matcher and reaches no platform function: a folder token is compared to a
 * path's folder as a string, and a file name to its basename. That is the whole
 * of the host-independence argument the grammar exists for — the platform's
 * glob matcher turns case-insensitive inside any segment carrying a wildcard,
 * and string equality does not turn into anything anywhere.
 *
 * Nothing here compares two SELECTORS. First-match-wins only ever asks "does
 * this rule select this file", so no overlap or containment procedure is
 * written; the cross-Module check that would have needed one is out of scope.
 */

import type { Selector } from '../../../config-contract/index.ts';
import { fileNameOf, folderOf } from '../../../foundation/selector-grammar.ts';
import type { FrontmatterRule } from '../../section.ts';
import type { RuleSelection } from './rules.types.ts';

/**
 * Whether one selector reaches one path.
 *
 * The product of the two axes, with an absent axis meaning every. That
 * composition is what makes folders-alone, names-alone and both-together one
 * rule rather than three branches — and it is also why both axes absent reaches
 * everything. A loaded config can never hold such a selector, because
 * `CONFIG_SELECTOR_MISSING` refuses a rule carrying neither and the same
 * at-least-one rule covers every exclusion; stating the composition here rather
 * than special-casing it keeps the predicate one expression and leaves the
 * refusal in the one place that can report a location.
 *
 * Both comparisons are case-sensitive on every host, matching what the corpus
 * walk already does with `.md`.
 *
 * @param selector The selector under test — a rule's own, or one of its exclusions.
 * @param path A normalised, repo-root-relative path.
 */
export function selectorMatches(selector: Selector, path: string): boolean {
  const byFolder = selector.folders === undefined || selector.folders.includes(folderOf(path));
  const byName = selector.fileNames === undefined || selector.fileNames.includes(fileNameOf(path));
  return byFolder && byName;
}

/**
 * The selector a rule carries, lifted off the rule itself.
 *
 * A rule IS a selector plus a reason plus a payload, so the two axes sit
 * directly on it; this names the selector half so that a rule's own selector
 * and its exclusions are handed to one predicate rather than two.
 *
 * @param rule The rule to read a selector off.
 */
function selectorOf(rule: FrontmatterRule): Selector {
  return { folders: rule.folders, fileNames: rule.fileNames };
}

/**
 * What this rule did with this path.
 *
 * Exclusion still wins outright, but the rule's own selector is asked FIRST so
 * that the two ways of not selecting stay distinguishable: `excluded` means
 * this rule reached the file and its own `excludeFiles` took it back, while
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
 */
export function selectionFor(rule: FrontmatterRule, path: string): RuleSelection {
  const matched = selectorMatches(selectorOf(rule), path);
  if (!matched) return 'unselected';

  const excluded = (rule.excludeFiles ?? []).some((exclusion) => selectorMatches(exclusion, path));
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
 */
export function ruleSelects(rule: FrontmatterRule, path: string): boolean {
  return selectionFor(rule, path) === 'selected';
}
