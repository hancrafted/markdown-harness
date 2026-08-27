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
 * One entry of an `allowed` set, as the Operator wrote it.
 *
 * `intent` is optional in the config and therefore nullable here. A failed
 * membership check prints the whole set uncapped with each value's meaning, so
 * the entry that omitted its intent still has to render — which is exactly what
 * `{ value: skill }` in the fixture config exists to force.
 */
export interface AllowedOption {
  value: string | number | boolean;
  intent: string | null;
}

/**
 * Which rule spoke.
 *
 * Identity is POSITIONAL, and that is a known cost rather than an oversight:
 * inserting a rule renumbers every later one, so a stored report's `rules[5]`
 * may name a different rule next week. The fix is a `name:` key on rules — a
 * config language change, cheap now and expensive once adopters have configs.
 *
 * The config address is derivable from `index` and so is not stored. The
 * selector is, because it is the answer to "why did THIS rule match?" and
 * cannot be recomputed from the report alone.
 */
export interface RuleRef {
  index: number;
  selector: SelectorRef;
}

/** How the rule selected, as written — the `fileName` sugar is not expanded away. */
export type SelectorRef = { path: readonly Glob[]; fileName?: never } | { fileName: string; path?: never };
