// The two files one rejected-config case is made of, on disk.
//
// AMBIENT READ: the filesystem, through `node:fs`, and the host's separator,
// through `node:path`. Nothing here decides anything — the prefix rule lives in
// `./frozen-rejection.pure.ts`, which is handed the path this file builds.
//
// The config path is BUILT and never read: a case reaching `CONFIG_NOT_FOUND`
// holds no config file at all, and one reaching `CONFIG_UNREADABLE` holds a
// directory where the file should be. Opening it here to check would refuse the
// two cases that exist to prove the loader opens it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CASE_CONFIG_LOCATION } from './frozen-rejection.pure.ts';

/**
 * The one expectation each case freezes.
 *
 * JSON rather than YAML, and the reason is the subject: the bytes beside it are
 * a YAML file whose defect is the point, so an expectation written in the same
 * language would sit one typo away from being read as the thing under test.
 */
export const CASE_EXPECTATION_FILE = 'expected-rejection.json';

/** Where the loader is pointed for `caseName` — the prefix its locations omit. */
export function caseConfigPath(tierRootPath: string, caseName: string): string {
  return join(tierRootPath, caseName, CASE_CONFIG_LOCATION);
}

/**
 * One case's frozen expectation, parsed but not yet checked.
 *
 * Neither the read nor the parse catches. A case directory with no expectation
 * in it is a broken case rather than a case to skip quietly, and an empty
 * rejection in its place would compare equal to nothing while naming no file.
 */
export function readFrozenExpectation(tierRootPath: string, caseName: string): unknown {
  return JSON.parse(readFileSync(join(tierRootPath, caseName, CASE_EXPECTATION_FILE), 'utf8'));
}
