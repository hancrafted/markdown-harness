/**
 * How a rule's selector is reported.
 *
 * `--audit` is the only response that carries a selector at all, and it carries
 * it AS WRITTEN. The resolver desugars `fileName` into `**\/<name>` because
 * precedence has to stay one-dimensional, but a diagnostic built from the
 * desugared form would hand an Operator a glob they never typed. So this reads
 * the rule rather than the resolver.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { SelectorRef } from '../../../response-contract/index.ts';

/**
 * The selector this rule was written with.
 *
 * @param rule The rule to read a selector off.
 */
export function selectorRefFor(rule: FrontmatterRule): SelectorRef {
  if ('fileName' in rule && rule.fileName !== undefined) return { fileName: rule.fileName };
  return { path: rule.path ?? [] };
}
