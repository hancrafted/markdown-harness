/**
 * Which corpus files are governed, and by which rule.
 *
 * Runs BEFORE any file is opened. That order is what lets `--check` read only
 * the files it will report on, and it is why an invisible file is absent from
 * the result for the stronger reason that nothing ever read it — rather than
 * being read, found conforming, and quietly dropped.
 *
 * Nothing here sorts: the walker's order is the report's order.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { findFirstMatch } from '../rules/first-match.pure.ts';
import type { GlobMatcher } from '../rules/rules.types.ts';
import type { GovernedFile } from './check.types.ts';

/**
 * Pair every governed path with the rule that won it under first-match.
 *
 * @param files The corpus, as normalised root-relative paths in walker order.
 * @param rules The ordered rule list, in the order the Operator wrote it.
 * @param matches The glob matcher to decide with.
 */
export function governedFiles(
  files: readonly string[],
  rules: readonly FrontmatterRule[],
  matches: GlobMatcher,
): readonly GovernedFile[] {
  return files.flatMap((path) => {
    const rule = findFirstMatch(path, rules, matches);
    return rule === undefined ? [] : [{ path, rule }];
  });
}
