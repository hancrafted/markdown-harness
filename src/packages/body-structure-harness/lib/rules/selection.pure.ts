/**
 * Selection on three axes: Core's two literal axes, decided from the path, and
 * `types`, decided from the file's frontmatter `type` (design-ADR 0012).
 *
 * Every axis a Rule carries must match and an absent axis means every. An
 * exclusion is Core's selector, so it too is decided from the path, and a Rule
 * whose exclusion removes a path cannot win the file whatever its `type`.
 *
 * REACH is the one definition `--check`, `--query` and `--audit` share
 * (design-ADR 0015): a Rule reaches a path when its folder and file-name axes
 * match it and its own `excludeFiles` does not remove it. The `types` axis
 * plays no part in reach, which is what lets `--query` answer before the file
 * exists.
 */

import type { Selector } from '../../../config-contract/index.ts';
import { fileNameOf, folderOf } from '../../../foundation/selector-grammar.ts';
import type { BodyStructureRule } from '../../section.ts';

/** How one Rule stands towards one file, for the audit tally. */
type Selection = 'selected' | 'excluded' | 'unselected';

/**
 * Whether Core's two literal axes both match a normalised path, before any
 * exclusion is consulted — for a Rule, also the question the audit asks to
 * know whether a file's `type` could make it count as excluded.
 *
 * @param selector A Rule, or one of its exclusions.
 * @param path A normalised, root-relative path.
 */
export function axesMatch(selector: Selector, path: string): boolean {
  const byFolder = selector.folders === undefined || selector.folders.includes(folderOf(path));
  const byName = selector.fileNames === undefined || selector.fileNames.includes(fileNameOf(path));
  return byFolder && byName;
}

/** Whether the Rule's own `excludeFiles` removes the path. */
function excludes(rule: BodyStructureRule, path: string): boolean {
  return (rule.excludeFiles ?? []).some((exclusion) => axesMatch(exclusion, path));
}

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
 * Whether a Rule reaches a path: its folder and file-name axes match and its
 * exclusion does not remove it. Decided from the path alone.
 *
 * @param rule One Rule of the section.
 * @param path A normalised, root-relative path.
 */
export function reaches(rule: BodyStructureRule, path: string): boolean {
  return axesMatch(rule, path) && !excludes(rule, path);
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
  if (!axesMatch(rule, path) || !typeMatches(rule, type)) return 'unselected';
  return excludes(rule, path) ? 'excluded' : 'selected';
}

/**
 * The Rule that wins a file under first-match, or `undefined` when none does.
 *
 * @param path A normalised, root-relative path.
 * @param type The file's frontmatter `type`, or `undefined` when it has none to read.
 * @param rules The section's Rules, in config order.
 */
export function firstMatch(
  path: string,
  type: string | undefined,
  rules: readonly BodyStructureRule[],
): BodyStructureRule | undefined {
  return rules.find((rule) => selectionFor(rule, path, type) === 'selected');
}
