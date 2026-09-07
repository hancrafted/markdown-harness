/**
 * The read edge: config path in, bytes or a fault out.
 *
 * The only file this Package opens. It decides nothing — which catalog entry a
 * failure earns is `./read-fault.pure`'s rule, so this file reads, catches, and
 * hands the platform's own errno to that rule.
 */

import { readFileSync } from 'node:fs';
import type { ConfigSource } from './config-load.types.ts';
import { faultForReadFailure } from './read-fault.pure.ts';

/**
 * Read the config file.
 *
 * A single `readFileSync` covers absence, directories and permission refusals
 * alike: a separate `stat` first would open a window in which the answer
 * changes between the two calls, and would still have to interpret the same
 * errno at the end.
 *
 * @param location The config path exactly as the caller wrote it — never resolved.
 */
export function readConfigSource(location: string): ConfigSource {
  try {
    return { text: readFileSync(location, 'utf8'), faults: [] };
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    return { faults: [faultForReadFailure(errorCode, location)] };
  }
}
