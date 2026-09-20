/**
 * Which catalog entry a failed read earns.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';

const ABSENT = 'ENOENT';

/**
 * Turn a failed read into the fault it deserves.
 *
 * @param errorCode The platform's errno code, if known.
 * @param location The config path as written by the caller.
 */
export function faultForReadFailure(errorCode: string | undefined, location: string): ConfigFault {
  const code = errorCode === ABSENT ? 'CONFIG_NOT_FOUND' : 'CONFIG_UNREADABLE';
  return { code, location };
}
