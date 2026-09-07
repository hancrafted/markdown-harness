/**
 * Which catalog entry a failed read earns.
 *
 * Extracted from the read adapter because it is a rule rather than a step: the
 * catalog draws a line between "no such thing" and "cannot serve it", and that
 * line is a decision this repo makes, not something the filesystem hands back.
 */

import type { ConfigFault } from '../../response-contract/index.ts';

/**
 * The one errno that proves absence.
 *
 * Everything else means the entry is there and unusable — a directory, a
 * permission refusal, a broken symlink target, a name too long.
 */
const ABSENT = 'ENOENT';

/**
 * Turn a failed read into the fault it deserves.
 *
 * Anything the platform declines to name resolves to `CONFIG_UNREADABLE`, never
 * `CONFIG_NOT_FOUND`: reporting a file missing when it exists is the false
 * negative the catalog exists to prevent, and the two are told apart by
 * evidence rather than by default.
 *
 * @param errorCode The platform's `errno` string, if it supplied one.
 * @param location The config path exactly as the caller wrote it — never resolved.
 */
export function faultForReadFailure(errorCode: string | undefined, location: string): ConfigFault {
  const code = errorCode === ABSENT ? 'CONFIG_NOT_FOUND' : 'CONFIG_UNREADABLE';
  return { code, location };
}
