/**
 * The small values every report is built out of.
 *
 * All evidence, no prose. What was there, which rule spoke, and what the
 * Operator wrote — never a sentence about any of it.
 */

import type { Glob } from './config.ts';

/**
 * What was actually in the file at an address.
 *
 * Evidence, and the whole of the `Found:` line. Deliberately not the raw value:
 * a 4 KB list has no business in a report, so a list contributes its length and
 * a mapping its keys.
 */
export type Observed =
  /** The address named nothing. */
  | { kind: 'absent' }
  /** The key was written with no value — `description:` and then a newline. */
  | { kind: 'null' }
  | { kind: 'scalar'; value: string | number | boolean }
  | { kind: 'list'; length: number }
  | { kind: 'mapping'; keys: readonly string[] };

/**
 * Which rule spoke.
 *
 * Identified by `ruleId`, never by position. Rules are ordered and first match
 * wins, so a rule's POSITION is semantic — but position is a terrible IDENTITY:
 * inserting one rule renumbers every later one, so a stored report's `rules[5]`
 * can name a different rule next week, and "why isn't my rule applying?" cannot
 * be answered about a moving target.
 *
 * `intent` is here rather than on each violation, and it is the only copy. A
 * field constraint that carries its own `intent` overrides it, and that override
 * travels inside the violation's `expected` fragment — so the two never store
 * the same sentence twice, and no resolution step happens behind the seam.
 * A rule-level constraint has no fragment of its own, so this is its reason.
 */
export interface RuleRef {
  ruleId: string;
  selector: SelectorRef;
  intent: string;
}

/** How the rule selected, as written — the `fileName` sugar is not expanded away. */
export type SelectorRef = { path: readonly Glob[]; fileName?: never } | { fileName: string; path?: never };
