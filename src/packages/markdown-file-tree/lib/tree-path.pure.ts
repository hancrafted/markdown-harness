/**
 * The shape and the order of paths inside the tree.
 *
 * Both exist for one reason: `root` travels in the response exactly as the
 * caller wrote it, so a stored response has to compare equal on another
 * machine. A host separator or a host collation would each break that, and
 * neither arrives as an argument — so neither is reachable from here.
 */

/**
 * Join a parent directory's root-relative path to one child entry's name.
 *
 * Forward slash always, never the platform separator: a Windows-shaped corpus
 * must answer the same as a POSIX one. At the root the parent is empty, which
 * is what keeps a leading `./` or `/` from ever reaching the report.
 *
 * @param parent The parent's root-relative path, or `''` at the root.
 * @param name A single entry name.
 */
export function childPath(parent: string, name: string): string {
  return parent === '' ? name : `${parent}/${name}`;
}

/** Compare two paths by UTF-16 code unit, the one collation no host supplies. */
function byCodeUnit(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Order the tree lexicographically.
 *
 * `localeCompare` is deliberately absent. It reads a host collation — an
 * ambient read no argument supplies — and it would order the same corpus
 * differently on two machines, which is exactly what `--check`'s file order and
 * this list are relied on not to do.
 *
 * Returns a new array; the caller's is left as written.
 *
 * @param paths Root-relative paths, in whatever order they were found.
 */
export function inTreeOrder(paths: readonly string[]): readonly string[] {
  return [...paths].sort(byCodeUnit);
}
