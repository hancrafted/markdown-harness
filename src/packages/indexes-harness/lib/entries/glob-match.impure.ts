/**
 * The platform's glob matcher, adapted to this Module's argument order.
 *
 * This file exists only to hold the builtin import, so the listing itself takes
 * a matcher as an argument and stays deterministic.
 *
 * KNOWN DUPLICATION, recorded rather than hidden: it is byte-for-byte the same
 * decision as `frontmatter-harness/lib/rules/glob-match.impure.ts`, which this
 * Package may not import because it is another Package's internal. Two Modules
 * now need `excludeFiles` to mean the same thing, and two copies of a matcher
 * are exactly how two Modules end up disagreeing about what a glob is. The
 * findings note carries it.
 */

import { matchesGlob } from 'node:path';

/**
 * Whether a glob selects a path.
 *
 * NOTE the argument order, deliberately the reverse of the builtin's:
 * `matchesGlob(path, pattern)` reads path-first, while the config's vocabulary
 * is glob-first. Getting this backwards silently answers about the wrong thing
 * rather than failing, so the flip is confined to this one line.
 *
 * @param glob A glob from a directory's `excludeFiles`.
 * @param path A repo-root-relative path.
 */
export function matchGlob(glob: string, path: string): boolean {
  return matchesGlob(path, glob);
}
