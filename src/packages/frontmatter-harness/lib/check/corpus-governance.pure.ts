/**
 * Which corpus files are governed, and by which rule.
 */

import type { FrontmatterRule } from '../../section.types.ts';
import { findFirstMatch } from '../rules/first-match.pure.ts';
import type { GovernedFile } from './check.types.ts';

/**
 * Pair every governed path with the rule that won it under first-match.
 *
 * @param files The corpus, as normalised root-relative paths in walker order.
 * @param rules The ordered rule list, in the order the Operator wrote it.
 */
export function governedFiles(files: readonly string[], rules: readonly FrontmatterRule[]): readonly GovernedFile[] {
  return files.flatMap((path) => {
    const rule = findFirstMatch(path, rules);
    return rule === undefined ? [] : [{ path, rule }];
  });
}
