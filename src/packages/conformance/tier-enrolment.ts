// Which tiers exist, and which tiers a runner claims — both read off the tree.
//
// Neither side is a hand-written list, and that is the whole point. A tier
// added without a runner would otherwise sit unnoticed: the fixtures would be
// committed, nothing would enumerate them, and the gate would stay green over a
// specification nobody checks.
//
// `tierRunners` reads this Package's own `tests/` directory. It does not IMPORT
// from it — a tests folder is private and reachable only by tests — it lists
// names, which is the only way a claim made by a file's existence can be
// derived at all.

import { fileURLToPath } from 'node:url';
import { conformanceRoot } from './case-corpus.ts';
import { tierOfRunnerFile } from './lib/tier/tier-name.pure.ts';
import { directoriesIn, fileNamesIn } from './lib/tier/tier-tree.impure.ts';

/** Where the runners sit. The trailing slash descends rather than replaces. */
const RUNNERS = new URL('./tests/', import.meta.url);

/** Every tier, by name, derived from the fixture tree. */
export function enrolledTiers(): readonly string[] {
  return directoriesIn(conformanceRoot());
}

/** Every tier a runner claims, by name, derived from this Package's tests. */
export function tierRunners(): readonly string[] {
  return fileNamesIn(fileURLToPath(RUNNERS))
    .map((fileName) => tierOfRunnerFile(fileName))
    .filter((tier): tier is string => tier !== undefined)
    .sort();
}
