/**
 * Selection on three axes: Core's two literal axes, decided from the path by
 * `foundation`, and `types`, decided from the file's frontmatter `type`
 * (design-ADR 0012).
 *
 * Every axis a Rule carries must match and an absent axis means every. This
 * file owns only the `types` axis and composes it with Core's answer; the two
 * literal axes, exclusion and REACH are Core's and are not restated here
 * (design-ADR 0022, amending design-ADR 0020). An exclusion is Core's selector,
 * so it is decided from the path, and a Rule whose exclusion removes a path
 * cannot win the file whatever its `type`.
 */

import type { Selection } from '../../../foundation/rule-selection.ts';
import { selectionFor as pathSelectionFor } from '../../../foundation/rule-selection.ts';
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
export function firstMatch(
  path: string,
  type: string | undefined,
  rules: readonly BodyStructureRule[],
): BodyStructureRule | undefined {
  return rules.find((rule) => selectionFor(rule, path, type) === 'selected');
}
