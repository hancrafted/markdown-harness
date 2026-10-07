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

import { hostPath } from '../foundation/host-path.ts';
import { readTextIn } from '../foundation/read-text.ts';
import { runEntry } from '../foundation/run-entry.ts';
import { caseDirectoriesIn, tierRoot } from './case-corpus.ts';
import { CASE_EXPECTATION_FILE, caseConfigPath, readFrozenExpectation } from './lib/rejection/case-files.impure.ts';
import { frozenRejection } from './lib/rejection/frozen-rejection.pure.ts';
import type { FrozenRejection } from './lib/rejection/frozen-rejection.types.ts';
import { faultSentenceOf, payloadComparison, renderRejectedCase } from './lib/rejection/rejected-case.pure.ts';
import type { RejectedCaseReport } from './lib/rejection/rejected-case.types.ts';
import { frozenComparison } from './lib/spec-folder/spec-folder.pure.ts';
import type { FrozenComparison } from './lib/spec-folder/spec-folder.types.ts';
import { ADOPTER_CONFIG_FILE, type ConformanceTier } from './tier-record.ts';
import { toolEntry } from './tool-answer.ts';

export type { FrozenRejection } from './lib/rejection/frozen-rejection.types.ts';
export type { RejectedCaseReport } from './lib/rejection/rejected-case.types.ts';
export { renderRejectedCase };

/**
 * The whole `check` envelope a case may freeze beside its payload: exactly what
 * `mh` prints inside the case directory, byte for byte.
 */
export const EXPECTED_CHECK_RESPONSE = 'expected-check-response.json';

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

/**
 * A case directory's host path.
 *
 * @param tier The tier's directory name.
 * @param caseName The case directory's name.
 */
export function rejectedCasePath(tier: string, caseName: string): string {
  return hostPath(tierRoot(tier), caseName);
}

/** A file in the case as text, or `undefined` when it is not there or not a readable file. */
function textIn(directory: string, file: string): string | undefined {
  const found = readTextIn(directory, file);
  return found.kind === 'text' ? found.text : undefined;
}

/**
 * Compare one rejected-config case end to end, at the process boundary.
 *
 * Runs the compiled `mh` INSIDE the case directory with no flag, as a human
 * does, and holds its `result` against `expected-rejection.json` and, where the
 * case freezes one, its whole stdout against `expected-check-response.json`.
 * The tier runner and `npm run conformance` both call this, so the two cannot
 * disagree about a case. It judges the LAST BUILD under `dist/` (trap 9 in
 * docs/agents/verification.md).
 *
 * @param directory The case directory's host path.
 * @param name What the report calls the case.
 */
export function compareRejectedCase(directory: string, name: string): RejectedCaseReport {
  const check = runEntry(toolEntry(), [], directory);
  const frozen: FrozenComparison[] = [
    payloadComparison(CASE_EXPECTATION_FILE, textIn(directory, CASE_EXPECTATION_FILE) ?? '', check.stdout),
  ];
  const envelope = textIn(directory, EXPECTED_CHECK_RESPONSE);
  if (envelope !== undefined) frozen.push(frozenComparison(EXPECTED_CHECK_RESPONSE, envelope, check.stdout));
  return {
    case: name,
    fault: faultSentenceOf(textIn(directory, ADOPTER_CONFIG_FILE)),
    frozen,
    agrees: frozen.every((comparison) => comparison.agrees),
  };
}
