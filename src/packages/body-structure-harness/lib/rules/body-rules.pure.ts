/**
 * The section's ordered Rule list, asked the one question every command asks of
 * it: which Rules can win this path, and which paths must be opened to know.
 *
 * Selection is on three axes: Core's two literal axes, decided from the path by
 * `foundation`, and `types`, decided from the file's frontmatter `type`
 *. Callers never combine `reaches` with `types` themselves;
 * the invariant that a Rule carrying no `types` ENDS the candidate list lives
 * here, once, and `pathsToOpen`, `candidatesFor` and `winnerFor` all follow it.
 *
 * Every axis a Rule carries must match and an absent axis means every. This
 * file owns only the `types` axis and composes it with Core's answer; the two
 * literal axes, exclusion and REACH are Core's and are not restated here
 *. An exclusion is Core's selector,
 * so it is decided from the path, and a Rule whose exclusion removes a path
 * cannot win the file whatever its `type`.
 */

import type { Selection } from '../../../foundation/rule-selection.ts';
import { selectionFor as pathSelectionFor, reaches, selectorMatches } from '../../../foundation/rule-selection.ts';
import type { BodyStructureRule } from '../../section.ts';

/**
 * Whether the file's `type` satisfies the `types` axis: always when the Rule
 * wrote none, and otherwise only by exact, case-sensitive equality with a
 * string `type`. A missing `type` selects no Rule that writes the axis.
 */
function typeMatches(rule: BodyStructureRule, type: string | undefined): boolean {
  if (rule.types === undefined) return true;
  return type !== undefined && rule.types.includes(type);
}

/**
 * How one Rule stands towards one file.
 *
 * `excluded` means all three axes matched and the Rule's own exclusion removed
 * the file — never a file whose `type` the Rule would not have taken anyway.
 *
 * @param rule One Rule of the section.
 * @param path A normalised, root-relative path.
 * @param type The file's frontmatter `type`, or `undefined` when it has none to read.
 */
export function selectionFor(rule: BodyStructureRule, path: string, type: string | undefined): Selection {
  return typeMatches(rule, type) ? pathSelectionFor(rule, path) : 'unselected';
}

/**
 * The Rule that wins a file under first-match, or `undefined` when none does.
 *
 * @param path A normalised, root-relative path.
 * @param type The file's frontmatter `type`, or `undefined` when it has none to read.
 * @param rules The section's Rules, in config order.
 */
export function winnerFor(
  path: string,
  type: string | undefined,
  rules: readonly BodyStructureRule[],
): BodyStructureRule | undefined {
  return rules.find((rule) => selectionFor(rule, path, type) === 'selected');
}

/**
 * Every Rule that could win a path before its file is opened, in config order.
 *
 * Those are the Rules that REACH it — folder and file-name axes matching, own
 * exclusion not removing it — ENDING at the first that carries no `types`: that
 * Rule wins every `type`, so anything after it is unreachable from the path
 * alone. A Rule whose exclusion removes the path is not a candidate, so it
 * neither appears nor ends the list.
 *
 * @param path A normalised, root-relative path.
 * @param rules The section's Rules, in config order.
 */
export function candidatesFor(path: string, rules: readonly BodyStructureRule[]): readonly BodyStructureRule[] {
  const reaching = rules.filter((rule) => reaches(rule, path));
  const last = reaching.findIndex((rule) => rule.types === undefined);
  return last === -1 ? reaching : reaching.slice(0, last + 1);
}

/**
 * Every path a check must open, in corpus order: those with a candidate. A path
 * no Rule reaches is never opened.
 *
 * @param paths The corpus, normalised, in walker order.
 * @param rules The section's Rules, in config order.
 */
export function pathsToOpen(paths: readonly string[], rules: readonly BodyStructureRule[]): readonly string[] {
  return paths.filter((path) => candidatesFor(path, rules).length > 0);
}

/**
 * Every path an audit must open, in corpus order: all `pathsToOpen` names, so
 * `--check` and the audit refuse over the same unreadable file, and every path
 * a Rule writing `types` matches on its path axes even where its own exclusion
 * removes it, because an `excluded` count needs all three axes to match and so
 * needs that file's `type`.
 *
 * @param paths The corpus, normalised, in walker order.
 * @param rules The section's Rules, in config order.
 */
export function pathsToAudit(paths: readonly string[], rules: readonly BodyStructureRule[]): readonly string[] {
  // A deliberate second statement of which Rules carry `types`: a typed Rule
  // that excludes a path is no candidate for it, yet the `excluded` count needs
  // that file's `type`, so `candidatesFor` cannot answer this.
  return paths.filter(
    (path) =>
      candidatesFor(path, rules).length > 0 ||
      rules.some((rule) => rule.types !== undefined && selectorMatches(rule, path)),
  );
}
