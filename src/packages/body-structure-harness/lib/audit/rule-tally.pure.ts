/**
 * How every Rule fared across one corpus, counted over all three axes.
 *
 * The first Module tallies from paths alone. This one cannot: whether a Rule
 * that writes `types` selected a file depends on the file's `type`, so a
 * shadowed or excluded count would be wrong without it. The caller opens the
 * files `pathsToAudit` names and hands each `type` in.
 *
 * Rows in config order, a Rule that won nothing included — that is the row an
 * Operator needs to see.
 */

import {
  selectorRefFor as coreSelectorRefFor,
  tallyRules as coreTallyRules,
} from '../../../foundation/rule-selection.ts';
import type { RuleAudit, SelectorRef } from '../../../response-contract/index.ts';
import type { BodyStructureRule } from '../../section.ts';
import { selectionFor } from '../rules/body-rules.pure.ts';

/** One corpus file and the `type` read out of it, `undefined` when there is none to read. */
interface TypedFile {
  path: string;
  type: string | undefined;
}

/** A Rule's selector as written: Core's two axes, then this Module's `types`, an axis it never wrote left out. */
function selectorRefFor(rule: BodyStructureRule): SelectorRef {
  return { ...coreSelectorRefFor(rule), ...(rule.types === undefined ? {} : { types: rule.types }) };
}

/**
 * Tally the section's Rules across a corpus: Core's tally, handed this Module's
 * three-axis verdict and its three-axis selector report.
 *
 * @param files Every corpus file with its `type`, in walker order.
 * @param rules The section's Rules, in config order.
 */
export function tallyRules(files: readonly TypedFile[], rules: readonly BodyStructureRule[]): readonly RuleAudit[] {
  return coreTallyRules(files, rules, {
    selection: (rule, file) => selectionFor(rule, file.path, file.type),
    refOf: selectorRefFor,
  });
}
