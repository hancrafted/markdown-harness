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
import { readTextIn } from '../foundation/read-text.ts';
import { conformanceRoot } from './case-corpus.ts';
import { readsOwnTier } from './lib/tier/runner-source.pure.ts';
import { tierOfRunnerFile } from './lib/tier/tier-name.pure.ts';
import { CONFORMANCE_TIERS } from './tier-record.ts';

/** Where the runners sit: this Package's own tests folder. */
const RUNNERS = hostPath(directoryOf(import.meta.url), 'tests');

/** Every declared tier name, in declaration order. */
export function declaredTierNames(): readonly string[] {
  return CONFORMANCE_TIERS.map((tier) => tier.name);
}

/** Every tier that exists, by name, derived from the fixture tree. */
export function enrolledTiers(): readonly string[] {
  const root = conformanceRoot();
  const found = directoryNamesIn(root);
  if (found === undefined) throw new Error(`the conformance fixtures have no readable directory at ${root}`);
  const declared = new Set(declaredTierNames());
  const undeclared = found.filter((tier) => !declared.has(tier));
  if (undeclared.length > 0)
    throw new Error(`the conformance fixtures contain undeclared tiers: ${undeclared.join(', ')}`);
  return found;
}

/** Every tier a runner claims, by name, derived from this Package's tests. */
export function tierRunners(): readonly string[] {
  const found = fileNamesIn(RUNNERS);
  if (found === undefined) throw new Error(`the conformance runners have no readable directory at ${RUNNERS}`);
  const runners = found.filter((fileName) => tierOfRunnerFile(fileName) !== undefined);
  for (const runner of runners) {
    const source = readTextIn(RUNNERS, runner);
    if (source.kind !== 'text') throw new Error(`the ${runner} runner is ${source.kind}`);
    if (!readsOwnTier(source.text)) throw new Error(`the ${runner} runner does not read its own tier record`);
  }
  return runners
    .map((fileName) => tierOfRunnerFile(fileName))
    .filter((tier): tier is string => tier !== undefined)
    .sort();
}
