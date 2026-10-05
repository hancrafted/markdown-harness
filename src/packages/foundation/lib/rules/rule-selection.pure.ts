/**
 * Which files a Rule claims, on Core's two literal axes.
 *
 * Two axes of literal tokens and no wildcard, so nothing here needs a matcher
 * or reaches a platform function: a folder token is compared to a path's
 * folder as a string, and a file name to its basename. An absent axis means
 * every. Both comparisons are case-sensitive on every host.
 *
 * Both Modules select with these functions, so `--query`, `--check` and
 * `--audit` cannot drift apart about what selecting means. A Module with an
 * axis of its own (`body-structure-harness`'s `types`) asks the question this
 * file answers and then narrows it — it never restates the two axes
 *.
 *
 * REACH is the one definition `--check`, `--query` and `--audit` share
 *: a Rule reaches a path when its folder and file-name axes
 * match it and its own `excludeFiles` does not remove it.
 */

import type { Selector } from '../../../config-contract/index.ts';
import type { SelectorRef } from '../../../response-contract/index.ts';
import { fileNameOf, folderOf } from '../tree/selector-grammar.pure.ts';
import type { RuleHead, Selection } from './rule-selection.types.ts';

/**
 * Whether one selector's two axes both match a normalised path, before any
 * exclusion is consulted. The same predicate answers for a Rule's own selector
 * and for each of its exclusions.
 *
 * Both axes absent matches everything. A loaded config can never hold such a
 * selector, because `CONFIG_SELECTOR_MISSING` refuses it; stating the
 * composition here keeps the predicate one expression.
 *
 * @param selector A Rule, or one of its exclusions.
 * @param path A normalised, root-relative path.
 */
export function selectorMatches(selector: Selector, path: string): boolean {
  const byFolder = selector.folders === undefined || selector.folders.includes(folderOf(path));
  const byName = selector.fileNames === undefined || selector.fileNames.includes(fileNameOf(path));
  return byFolder && byName;
}

/** Whether the Rule's own `excludeFiles` removes the path. */
function excludes(rule: RuleHead, path: string): boolean {
  return (rule.excludeFiles ?? []).some((exclusion) => selectorMatches(exclusion, path));
}

/**
 * Whether a Rule reaches a path: its two axes match and its exclusion does not
 * remove it. Decided from the path alone.
 *
 * @param rule One Rule.
 * @param path A normalised, root-relative path.
 */
export function reaches(rule: RuleHead, path: string): boolean {
  return selectorMatches(rule, path) && !excludes(rule, path);
}

/**
 * How one Rule stands towards one path on Core's axes.
 *
 * The Rule's own selector is asked FIRST so the two ways of not selecting stay
 * distinguishable: `excluded` means the Rule reached the path and its own
 * `excludeFiles` took it back, `unselected` means it never reached it. An
 * `excluded` verdict is a fact about one Rule alone and never about the list,
 * which is what lets a file fall THROUGH to a later, broader Rule.
 *
 * @param rule One Rule.
 * @param path A normalised, root-relative path.
 */
export function selectionFor(rule: RuleHead, path: string): Selection {
  if (!selectorMatches(rule, path)) return 'unselected';
  return excludes(rule, path) ? 'excluded' : 'selected';
}

/**
 * The Rule that wins a path under first-match, or `undefined` when none does.
 * Written order IS the precedence; nothing merges and nothing sorts.
 *
 * @param path A normalised, root-relative path.
 * @param rules The Rules, in the order the Operator wrote them.
 */
export function firstMatch<R extends RuleHead>(path: string, rules: readonly R[]): R | undefined {
  return rules.find((rule) => selectionFor(rule, path) === 'selected');
}

/**
 * A Rule's selector as written: an axis it never wrote is left out entirely,
 * so a reader can tell absent (every) from empty (nothing).
 *
 * @param rule The Rule to read a selector off.
 */
export function selectorRefFor(rule: Selector): SelectorRef {
  return {
    ...(rule.folders === undefined ? {} : { folders: rule.folders }),
    ...(rule.fileNames === undefined ? {} : { fileNames: rule.fileNames }),
  };
}
