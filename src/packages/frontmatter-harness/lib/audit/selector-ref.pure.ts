/**
 * A rule's selector, as reported.
 *
 * `--audit` is the only response that carries a selector at all, and it carries
 * it AS WRITTEN. Nothing is desugared on the way out and nothing is filled in:
 * an axis the Operator never wrote is absent here too, because a report that
 * echoed `fileNames: []` back at a folder-only rule would be telling them their
 * rule selects no file names, when it selects every one.
 *
 * Absent and empty are therefore two different answers, and both reach the
 * wire. That distinction is the whole reason this file spreads keys
 * conditionally rather than building one object literal.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { SelectorRef } from '../../../response-contract/index.ts';

/**
 * The selector this rule was written with.
 *
 * @param rule The rule to read a selector off.
 */
export function selectorRefFor(rule: FrontmatterRule): SelectorRef {
  return {
    ...(rule.folders === undefined ? {} : { folders: rule.folders }),
    ...(rule.fileNames === undefined ? {} : { fileNames: rule.fileNames }),
  };
}
