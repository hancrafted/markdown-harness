/**
 * The one runtime value this Package ships.
 *
 * It sits here rather than beside its types because a `types` file may hold no
 * runtime value at all — not a function, not a constant. The guard is a
 * function of its argument alone, so the `pure` classifier is the honest home.
 */

import type { ConfigErrorResult } from './config-error.types';

/**
 * The failure variant announces itself; no sibling result declares `error`.
 * Narrow with this before reading any success field.
 */
export function isConfigError(result: object): result is ConfigErrorResult {
  return 'error' in result;
}
