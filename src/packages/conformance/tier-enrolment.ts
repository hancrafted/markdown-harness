// Which tiers exist, and which tiers a runner claims — both read off the tree.
//
// Neither side is a hand-written list, and that is the whole point. A tier
// added without a runner would otherwise sit unnoticed: fixtures would be
// committed, nothing would enumerate them, and the gate would stay green over a
// specification nobody checks.
//
// `tierRunners` reads this Package's own `tests/` directory. It does not IMPORT
// from it — a tests folder is private and reachable only by tests — it lists
// the names, which is the only way a claim made by a file's existence can be
// derived at all.
//
// Both reads go through `foundation`, and both turn its refusal into a throw
// here. A directory that cannot be listed would otherwise enumerate to nothing,
// and an empty list on either side of this comparison compares equal to an
// empty list on the other — the one failure this check exists to prevent.

import { directoryOf, hostPath } from '../foundation/host-path.ts';
import { directoryNamesIn, fileNamesIn } from '../foundation/list-directory.ts';
import { conformanceRoot } from './case-corpus.ts';
import { tierOfRunnerFile } from './lib/tier/tier-name.pure.ts';

/** Where the runners sit: this Package's own tests folder. */
const RUNNERS = hostPath(directoryOf(import.meta.url), 'tests');

/** Every tier that exists, by name, derived from the fixture tree. */
export function enrolledTiers(): readonly string[] {
  const root = conformanceRoot();
  const found = directoryNamesIn(root);
  if (found === undefined) throw new Error(`the conformance fixtures have no readable directory at ${root}`);
  return found;
}

/** Every tier a runner claims, by name, derived from this Package's tests. */
export function tierRunners(): readonly string[] {
  const found = fileNamesIn(RUNNERS);
  if (found === undefined) throw new Error(`the conformance runners have no readable directory at ${RUNNERS}`);
  return found
    .map((fileName) => tierOfRunnerFile(fileName))
    .filter((tier): tier is string => tier !== undefined)
    .sort();
}
