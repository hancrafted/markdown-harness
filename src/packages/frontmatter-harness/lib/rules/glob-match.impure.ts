/**
 * The platform's glob matcher, adapted to the resolver's argument order.
 *
 * This file exists only to hold the builtin import. Resolution itself takes a
 * matcher as an argument and stays deterministic, so the one edge that reaches
 * the platform is this function and nothing else.
 */

import { matchesGlob } from 'node:path';

/**
 * Whether a glob selects a path.
 *
 * NOTE the argument order, which is deliberately the reverse of the builtin's:
 * `matchesGlob(path, pattern)` reads path-first, while the config's vocabulary
 * is glob-first — a rule owns globs and is offered paths. Getting this backwards
 * silently answers about the wrong thing rather than failing, so the flip is
 * confined to this one line.
 *
 * @param glob A glob from a rule's selector.
 * @param path A normalised, repo-root-relative path.
 */
export function matchGlob(glob: string, path: string): boolean {
  return matchesGlob(path, glob);
}
