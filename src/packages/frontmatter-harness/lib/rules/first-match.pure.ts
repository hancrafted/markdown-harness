/**
 * Which rule governs a path.
 *
 * The harness walks the list top-down and the FIRST matching rule is the
 * complete set of constraints that applies.
 */

import type { FrontmatterRule } from '../../section.types.ts';
import { ruleSelects } from './selector.pure.ts';

/**
 * The rule that wins for this path, or nothing if the config passes it by.
 *
 * @param path A normalised, repo-root-relative path.
 * @param rules The ordered rule list, in the order the Operator wrote it.
 */
export function findFirstMatch(path: string, rules: readonly FrontmatterRule[]): FrontmatterRule | undefined {
  return rules.find((rule) => ruleSelects(rule, path));
}
