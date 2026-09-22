// What one rejected-config case is, read from its own two files.
//
// A rejected config produces no document, so a case here is not a document. It
// is a DIRECTORY: config bytes under the adopter's own config filename, plus one
// expectation freezing the whole config-error response verbatim with the fault
// list ordered. The config filename is the adopter's rather than the case's
// because several codes carry the config path in their location — a per-case
// filename would write the case's own name into the contract it freezes.
//
// The tier name is spelled here once. A runner asking for a case by name never
// repeats it, which is what keeps `fixtures/conformance/rejected-config/` a
// path this Package states in one place.

import { caseDirectoriesIn, tierRoot } from './case-corpus.ts';
import { caseConfigPath, readFrozenExpectation } from './lib/rejection/case-files.impure.ts';
import { frozenRejection } from './lib/rejection/frozen-rejection.pure.ts';
import type { FrozenRejection } from './lib/rejection/frozen-rejection.types.ts';
import type { ConformanceTier } from './tier-record.ts';

export type { FrozenRejection } from './lib/rejection/frozen-rejection.types.ts';

/** Every case in the tier, by directory name, sorted. */
export function rejectedConfigCases(tier: ConformanceTier): readonly string[] {
  return caseDirectoriesIn(tier.name);
}

/**
 * Where a runner points the loader for `caseName`.
 *
 * Built, never checked. Two cases in this tier reach their fault precisely
 * because nothing readable is at this path — one holds no config file and one
 * holds a directory where the file should be — so a guard here would refuse the
 * cases that prove the loader's own read-fault rule.
 */
export function configPathOf(tier: ConformanceTier, caseName: string): string {
  return caseConfigPath(tierRoot(tier.name), caseName, tier.configFile);
}

/**
 * The whole response `caseName` freezes, with the prefix its locations omit.
 *
 * Locations are stated case-relative in the file and resolved here, so a case
 * travels to a reimplementation unchanged and a tier move stays a rename.
 */
export function expectedRejectionOf(tier: ConformanceTier, caseName: string): FrozenRejection {
  const parsed = readFrozenExpectation(tierRoot(tier.name), caseName);
  return frozenRejection(parsed, { path: configPathOf(tier, caseName), file: tier.configFile }, caseName);
}
