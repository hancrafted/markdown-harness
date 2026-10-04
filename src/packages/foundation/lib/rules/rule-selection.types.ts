/**
 * The Core's view of a Rule: a selector plus a name and a reason, and the
 * exclusions that give files back.
 *
 * Both Modules' Rule types satisfy it structurally, and a Module's own extra
 * axis (`types` for `body-structure-harness`, design-ADR 0012) rides on the
 * Module's Rule type and is consulted through a callback, never named here —
 * which is what keeps the Core selector at two literal axes (design-ADR 0007).
 */

import type { Selector } from '../../../config-contract/index.ts';
import type { SelectorRef } from '../../../response-contract/index.ts';

/** What the Core needs to read off one Rule to select with it and to report it. */
export type RuleHead = Selector & {
  ruleId: string;
  intent: string;
  excludeFiles?: readonly Selector[];
};

/**
 * How one Rule stands towards one file.
 *
 * Three states rather than a boolean, because `--audit` has to tell the two
 * ways of not selecting apart: `unselected` is a Rule that never reached the
 * file, `excluded` is a Rule whose own `excludeFiles` took it back.
 */
export type Selection = 'selected' | 'excluded' | 'unselected';

/**
 * How the audit tally reads one Module's Rules: the verdict for one file, and
 * the selector as the report carries it. A Module with an axis of its own
 * (`types`) puts it here, so the Core tally never names it.
 */
export interface TallyReading<R, F> {
  selection: (rule: R, file: F) => Selection;
  refOf: (rule: R) => SelectorRef;
}
