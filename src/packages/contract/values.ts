/**
 * The small values every response is built out of.
 *
 * All evidence, no prose. What was there, which rule spoke, and what the
 * Operator wrote — never a sentence about any of it.
 */

import type { Glob } from './config.ts';

/**
 * What was actually at an address, DIRECTLY.
 *
 * This replaces a tagged union — `{ kind: 'scalar', value: 'draft' }` — and the
 * tag went because it earned nothing. Its stated job was keeping a 4 KB list out
 * of a report, but frontmatter is small by nature and the wrapper was charged on
 * every violation to insure against a case the corpus does not contain.
 * Measured across all three corpora at the time of the change: 87 violations, of
 * which exactly ONE carried a container. `value: 'draft'` is what a consumer can
 * act on without unwrapping anything.
 *
 * Two things the tag did carry are kept, because both are load-bearing:
 *
 * ABSENCE IS THE KEY'S OMISSION, not `null`. A violation whose address named
 * nothing has no `value` key at all, so `value: null` keeps its literal meaning
 * — the key is there and holds nothing. `MISSING_REQUIRED_FIELD` and
 * `EMPTY_REQUIRED_FIELD` are separate codes for the same reason: a bare
 * `description:` is a different mistake from a missing one, with a different
 * fix, and tenet 7 pays to keep silent-misparse classes apart.
 *
 * A CONTAINER STILL CONTRIBUTES ITS SIZE rather than its contents. `sources` in
 * OKF §5.1 is unbounded, and a violation repeats per faulty file across a whole
 * corpus, so this is the one place where the size guard is not hypothetical.
 * The shape is only reached for a list or a mapping, which is the case a
 * consumer already has to branch on.
 */
export type FieldValue =
  | string
  | number
  | boolean
  /** The key was written with no value — `description:` and then a newline. */
  | null
  /** A list: how many entries, never which. */
  | { items: number }
  /** A mapping: which keys, never their values. */
  | { keys: readonly string[] };

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
 * travels inside the violation's `requirement` fragment — so the two never store
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
