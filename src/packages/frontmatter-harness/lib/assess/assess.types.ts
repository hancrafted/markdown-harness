/**
 * The seams inside `--assess`.
 *
 * ONE shape now, and the other one is the gate's. What sits at a path is
 * `foundation`'s `FileRead` — text, absence or unreadability — because that
 * question is not about frontmatter, and three Packages answered it separately
 * before the gate existed. Whether the bytes make a freshness claim is a
 * reading of them, and it stays here: the READ moved out, the POLICY did not.
 *
 * Keeping absence and unreadability apart still matters and is still what the
 * five states rest on — one is a file an agent may be about to write, the other
 * a repair someone owes — it is simply not a distinction this Module invents.
 */

import type { AssessEvidence } from '../../../response-contract/index.ts';

/** How the file answered, when it could answer at all. */
export type Freshness =
  /** The claim ran out at or before the instant. */
  | { state: 'stale'; evidence: AssessEvidence }
  /** The claim still holds. */
  | { state: 'fresh'; evidence: AssessEvidence }
  /** The file made no freshness claim this could read. */
  | { state: 'unassessable' };
