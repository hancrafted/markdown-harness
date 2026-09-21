// One Conformance case's bytes, read as text.
//
// The read is `foundation`'s and the refusal is this file's. A case path the
// corpus walk produced and the gate cannot open means the tree moved under the
// suite, and an empty string in its place would read as a case carrying no
// marker — a whole tier could then pass over nothing.

import { readTextIn } from '../../../foundation/read-text.ts';

/**
 * The text of the case at `casePath`, tier-relative.
 *
 * Tier-relative and not repo-relative on purpose: it is the same path the
 * harness reports and the same path the tier's config selects on, so moving a
 * tier stays a rename here instead of a rewrite of every caller.
 */
export function readCaseText(tierRoot: string, casePath: string): string {
  const found = readTextIn(tierRoot, casePath);
  if (found.kind !== 'text') throw new Error(`the case at ${casePath} is ${found.kind} under ${tierRoot}`);
  return found.text;
}
