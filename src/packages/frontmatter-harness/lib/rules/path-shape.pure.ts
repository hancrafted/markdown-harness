/**
 * One spelling for one path.
 *
 * A query answers about a path that need not exist, so there is no filesystem
 * to ask what a path "really" is. Normalisation is therefore textual and
 * deliberately shallow: it removes the decoration a caller types and nothing
 * else. Resolving `..`, or collapsing an interior `./`, would answer about a
 * different path than the one asked about.
 */

/** Leading `./` or `/`, however many times the caller wrote it. */
const LEADING_DECORATION = /^(?:\.\/|\/)+/;

/**
 * Normalise a path to the shape the response echoes back.
 *
 * `/`-separated, with no leading `./` or `/`, so a caller can key on what it
 * gets back. Backslashes convert first: a Windows-shaped path must select the
 * same rules as its POSIX spelling, or the same repo would answer differently
 * on two machines.
 *
 * @param path The path exactly as the caller wrote it.
 */
export function normalisePath(path: string): string {
  return path.replace(/\\/g, '/').replace(LEADING_DECORATION, '');
}
