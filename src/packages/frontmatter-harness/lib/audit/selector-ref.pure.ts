/**
 * How a rule's selector is reported.
 *
 * `--audit` is the only response that carries a selector at all, and it carries
 * it AS WRITTEN. The resolver desugars `fileName` into `**\/<name>` because
 * precedence has to stay one-dimensional, but a diagnostic built from the
 * desugared form would hand an Operator a glob they never typed. So this reads
 * the rule rather than the resolver.
 */

import type { SelectorRef } from '../../../response-contract/index.ts';
import type { FrontmatterRule } from '../../section.types.ts';

/**
 * The selector this rule was written with.
 *
 * @param rule The rule to read a selector off.
 */
export function selectorRefFor(rule: FrontmatterRule): SelectorRef {
  const ref: SelectorRef = {};
  if (rule.folders !== undefined) ref.folders = rule.folders;
  if (rule.folderTrees !== undefined) ref.folderTrees = rule.folderTrees;
  if (rule.fileNames !== undefined) ref.fileNames = rule.fileNames;
  return ref;
}
