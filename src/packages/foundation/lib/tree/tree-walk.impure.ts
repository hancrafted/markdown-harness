/**
 * The recursion that reads the filesystem, through the gate's platform file.
 *
 * Every decision arrives from `corpus-entry.pure` and `containment.pure`, so
 * this file contributes the reading and the descent — not the rules. The one
 * judgement it does own is what to do when a directory cannot be read at all,
 * and it takes the strict one: a tree that could not be fully enumerated is
 * refused whole. Skipping an unreadable directory and reporting on the rest
 * would answer "nothing wrong" about files nobody looked at, and a false clean
 * is what the specification forbids.
 *
 * TWO THINGS A SYMLINK CAN DO, AND BOTH ARE ANSWERED HERE.
 *
 * It can point OUT of the corpus. A symlinked document is collected — this
 * repository symlinks `CLAUDE.md` to `AGENTS.md` and dropping those would leave
 * real documents ungoverned — so without a containment check a link inside the
 * root could put another repository's bytes behind a path in this one's report.
 * Such a link now REFUSES THE WHOLE TREE rather than being quietly skipped: a
 * corpus that reaches outside itself is a corpus nobody stated, and answering
 * about the rest of it would be the same false clean as skipping an unreadable
 * directory.
 *
 * It can point AT ITSELF. A link chain that closes on itself raises `ELOOP`
 * from the host, and before the gate that error propagated out of the walk as a
 * stack trace. It is now caught in `node-host.impure.ts`, which answers
 * "unresolvable" instead, and an entry nobody can resolve is ignored on the
 * same terms as a broken link. A CYCLE THROUGH DIRECTORIES is caught by the
 * other mechanism entirely — a linked directory is never descended into, so the
 * cycle is never entered. Both are proven by planting real trees in the
 * integration suite.
 */

import { hostPathOf, readHostDirectory, realHostPath, resolvedKindOf } from '../platform/node-host.impure.ts';
import type { HostEntryKind } from '../platform/node-host.types.ts';
import { isInsideRoot } from './containment.pure.ts';
import { actionFor } from './corpus-entry.pure.ts';
import type { EntryKind } from './tree-entry.types.ts';
import { childPath } from './tree-path.pure.ts';

/**
 * What one entry is to the walk, or the refusal it earns.
 *
 * `escaped` is not an `EntryKind` because it is not a kind of thing: it is a
 * statement about where the thing resolved to, and the tree is refused on it
 * rather than the entry ignored.
 */
type EntryReading = EntryKind | 'escaped';

/**
 * What one entry is, resolving a symlink through to its target and asking
 * whether that target is still inside the corpus.
 *
 * A directory entry and a plain file are answered without a second syscall.
 * Only a symlink pays for the two below it, and only a symlink can escape.
 *
 * @param rootReal The corpus root, already resolved to a real path.
 * @param absolute The entry, as the filesystem addresses it.
 * @param kind What the directory listing said the entry is, symlink unfollowed.
 */
function readingOf(rootReal: string, absolute: string, kind: HostEntryKind): EntryReading {
  if (kind !== 'symlink') return kind;

  const real = realHostPath(absolute);
  // A link nobody can resolve — broken, or a chain that closes on itself. It is
  // not a corpus member, and it is not a failure to enumerate either.
  if (real === undefined) return 'other';
  if (!isInsideRoot(rootReal, real)) return 'escaped';

  const target = resolvedKindOf(absolute);
  if (target === 'directory') return 'linked-directory';
  return target === 'file' ? 'file' : 'other';
}

/** The two things every level of one walk shares: where it started, and what it is filling. */
interface Walk {
  /** The corpus root, already resolved to a real path. */
  rootReal: string;
  /** The collection being appended to. */
  into: string[];
}

/**
 * Walk one directory, appending every corpus member below it.
 *
 * Returns `false` the moment any directory in the subtree cannot be read, or
 * any symlink in it resolves outside the corpus root.
 *
 * @param walk The root the walk is anchored at, and the collection it fills.
 * @param absolute The directory to read, as the filesystem addresses it.
 * @param relative The same directory, root-relative and `/`-separated.
 */
function collectInto(walk: Walk, absolute: string, relative: string): boolean {
  const entries = readHostDirectory(absolute);
  if (entries === undefined) return false;

  for (const entry of entries) {
    const childAbsolute = hostPathOf(absolute, [entry.name]);
    const reading = readingOf(walk.rootReal, childAbsolute, entry.kind);
    if (reading === 'escaped') return false;

    const action = actionFor(reading, entry.name);

    if (action === 'collect') {
      walk.into.push(childPath(relative, entry.name));
      continue;
    }

    if (action === 'ignore') continue;

    const read = collectInto(walk, childAbsolute, childPath(relative, entry.name));
    if (!read) return false;
  }

  return true;
}

/**
 * Every corpus member under `root`, in the order the filesystem offered them.
 *
 * `undefined` means the tree could not be read or could not be trusted — the
 * root does not exist, it is not a directory, a directory inside it refused to
 * open, or a symlink inside it reaches outside the corpus. It is NEVER an empty
 * corpus, which `--check` would otherwise report as `invalidFiles: 0`.
 *
 * @param root The corpus directory, exactly as the caller wrote it.
 */
export function walkTree(root: string): readonly string[] | undefined {
  const rootReal = realHostPath(root);
  if (rootReal === undefined) return undefined;

  const found: string[] = [];
  const read = collectInto({ rootReal, into: found }, root, '');
  return read ? found : undefined;
}
