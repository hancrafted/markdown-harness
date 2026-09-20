// One Conformance case's bytes, read as text.
//
// AMBIENT READ: the filesystem, through `node:fs`. It does not catch: a case
// path the corpus walk produced and this cannot open means the tree moved under
// the suite, and an empty string in its place would read as a case carrying no
// marker.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The text of the case at `casePath`, which is tier-relative.
 *
 * Tier-relative rather than repo-relative on purpose: it is the same path the
 * harness reports and the same path the tier's config selects on, so moving a
 * tier stays a rename here instead of a rewrite of every caller.
 */
export function readCaseText(tierRoot: string, casePath: string): string {
  return readFileSync(join(tierRoot, casePath), 'utf8');
}
