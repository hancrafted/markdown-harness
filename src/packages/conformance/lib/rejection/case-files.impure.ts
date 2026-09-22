// The two files one rejected-config case is made of, on disk.
//
// AMBIENT READ: the filesystem and the host's separator, both through
// `foundation` — this Package is not a Module, and it is not exempt from the
// gate either. Nothing here decides anything: the prefix rule lives in
// `./frozen-rejection.pure.ts`, which is handed the path this file builds.
//
// The config path is BUILT and never read: a case reaching `CONFIG_NOT_FOUND`
// holds no config file at all, and one reaching `CONFIG_UNREADABLE` holds a
// directory where the file should be. Opening it here to check would refuse the
// two cases that exist to prove the loader opens it.

import { hostPath } from '../../../foundation/host-path.ts';
import { readTextIn } from '../../../foundation/read-text.ts';
import { CASE_CONFIG_LOCATION } from './frozen-rejection.pure.ts';

/**
 * The one expectation each case freezes.
 *
 * JSON rather than YAML, and the reason is the subject: the bytes beside it are
 * a YAML file whose defect is the point, so an expectation written in the same
 * language would sit one typo away from being read as the thing under test.
 */
const CASE_EXPECTATION_FILE = 'expected-rejection.json';

/** Where the loader is pointed for `caseName` — the prefix its locations omit. */
export function caseConfigPath(tierRootPath: string, caseName: string): string {
  return hostPath(tierRootPath, caseName, CASE_CONFIG_LOCATION);
}

/**
 * One case's frozen expectation, parsed but not yet checked.
 *
 * The gate's refusal becomes a throw here, and the parse does not catch at all.
 * A case directory with no expectation in it is a broken case rather than a
 * case to skip quietly, and an empty rejection in its place would compare equal
 * to nothing while naming no file.
 */
export function readFrozenExpectation(tierRootPath: string, caseName: string): unknown {
  const found = readTextIn(tierRootPath, hostPath(caseName, CASE_EXPECTATION_FILE));
  if (found.kind !== 'text') throw new Error(`the ${caseName} case is ${found.kind} at ${CASE_EXPECTATION_FILE}`);
  return JSON.parse(found.text);
}
