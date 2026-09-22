/**
 * Whether a resolved target is still inside the corpus root.
 *
 * The walk collects a symlinked DOCUMENT, and must: this repository symlinks
 * `CLAUDE.md` to `AGENTS.md` at three levels, and dropping those would leave
 * real documents silently ungoverned. The hole that leaves open is a symlink
 * inside the root whose target is somewhere else entirely — a verdict then
 * rests on bytes the caller never offered, and a report naming `docs/x.md`
 * would be about a file in another repository.
 *
 * Both paths arrive ALREADY RESOLVED. Resolving is a filesystem read and
 * cannot happen here; what is left is a string comparison, which is the half
 * worth testing without a tree.
 */

/**
 * The two separators a host path can use.
 *
 * Both are named rather than the one this process runs under, because the
 * separator is an ambient read and no argument here supplies it. Neither
 * character is legal inside a path SEGMENT on either platform, so accepting
 * both cannot widen the answer on either one.
 */
const SEPARATORS: readonly string[] = ['/', '\\'];

/**
 * Whether `target` is the root itself or sits below it.
 *
 * The boundary character is what makes this a containment check rather than a
 * prefix check: without it a root of `/corpus` would contain `/corpus-backup`,
 * and a sibling directory one character away would be read as part of the tree.
 *
 * @param root The corpus root, already resolved to a real path.
 * @param target The symlink's target, already resolved to a real path.
 */
export function isInsideRoot(root: string, target: string): boolean {
  if (target === root) return true;
  if (!target.startsWith(root)) return false;

  const lastOfRoot = root.charAt(root.length - 1);
  if (SEPARATORS.includes(lastOfRoot)) return true;

  return SEPARATORS.includes(target.charAt(root.length));
}
