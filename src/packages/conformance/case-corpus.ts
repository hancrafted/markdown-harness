// Where the Conformance corpus is, and the tiers it holds.
//
// `fixtures/conformance/` is NOT a corpus root. It holds tiers, one directory
// each, and a TIER root is the synthetic repo root a runner points at: the
// `frontmatter` tier holds its own `valid-test-config.yaml`, and its selectors
// are written relative to that directory.
//
// This Package is not a Module. A Module is named by the checking domain it
// owns a top-level config section for, and membership is decided by the
// declared Module set rather than by where a folder sits — so nothing about
// `conformance/` living beside `frontmatter-harness/` under `src/packages/`
// makes it one, and no naming convention has to carry the distinction.
//
// Not a Module does not make it exempt from the gate, either. Every path below
// is assembled and every directory read through `foundation`, on the same terms
// as any Module: these are production files, and only a test file at one of
// ARCH-003's two homes is carved out of ARCH-008 §2.1.

import { directoryOf, hostPath } from '../foundation/host-path.ts';
import { directoryNamesIn } from '../foundation/list-directory.ts';
import { listMarkdownFiles } from '../foundation/list-markdown-files.ts';

/** The directory holding every tier, resolved from this file's own location. */
const TIERS = hostPath(directoryOf(import.meta.url), '..', '..', '..', 'fixtures', 'conformance');

/** The directory holding every tier. Not a corpus — see the note above. */
export function conformanceRoot(): string {
  return TIERS;
}

/** One tier's root: the synthetic repo root a runner checks against. */
export function tierRoot(tier: string): string {
  return hostPath(TIERS, tier);
}

/**
 * Every case in `tier`, tier-relative and sorted.
 *
 * Throws where the tier cannot be walked. A tier that enumerates to nothing
 * would pass every per-case assertion over no cases at all, and the declared
 * case count each runner states is the other half of that guard.
 */
export function casesIn(tier: string): readonly string[] {
  const root = tierRoot(tier);
  const found = listMarkdownFiles(root);
  if (found === undefined) throw new Error(`the ${tier} tier has no readable directory at ${root}`);
  return found;
}

/**
 * Every case DIRECTORY in `tier`, by name, sorted.
 *
 * A rejected-config case is a directory rather than a document: config bytes
 * under the adopter's own config filename, plus one frozen expectation.
 */
export function caseDirectoriesIn(tier: string): readonly string[] {
  const root = tierRoot(tier);
  const found = directoryNamesIn(root);
  if (found === undefined) throw new Error(`the ${tier} tier has no readable directory at ${root}`);
  return found;
}
