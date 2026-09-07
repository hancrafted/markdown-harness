/**
 * Which rule governs a path.
 *
 * The harness walks the list top-down and the FIRST matching rule is the
 * complete set of constraints that applies. Nothing merges, nothing is
 * inherited, and nothing here sorts: written order IS the precedence, which is
 * why the config's rule list is a list and not a mapping.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { GlobMatcher } from './rules.types.ts';
import { ruleSelects } from './selector.pure.ts';

/**
 * The rule that wins for this path, or nothing if the config passes it by.
 *
 * `undefined` is a claim about the whole config rather than a null rule: no
 * rule selected the path in the first place. A rule's own `excludeFiles` can be
 * one reason why, and the path may still be claimed by a later rule — exclusion
 * removes a file from ONE rule, never from the list.
 *
 * @param path A normalised, repo-root-relative path.
 * @param rules The ordered rule list, in the order the Operator wrote it.
 * @param matches The glob matcher to decide with.
 */
export function findFirstMatch(
  path: string,
  rules: readonly FrontmatterRule[],
  matches: GlobMatcher,
): FrontmatterRule | undefined {
  return rules.find((rule) => ruleSelects(rule, path, matches));
}
