/**
 * The recursion that reads the filesystem, and the only file here that does.
 *
 * Every decision it makes arrives from `corpus-entry.pure`, so what this file
 * contributes is the reading and the descent — not the rules. The one judgement
 * it does own is what to do when a directory cannot be read at all, and it is
 * the strict one: a tree that could not be fully enumerated is refused whole.
 * Skipping the unreadable directory and reporting on the rest would answer
 * "nothing wrong" about files nobody looked at, which is the false clean the
 * specification forbids for a mistyped `--root` and is no better one level down.
 */

import { readdirSync, statSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import { actionFor } from './corpus-entry.pure.ts';
import type { EntryKind } from './tree-entry.types.ts';
import { childPath } from './tree-path.pure.ts';

/** One directory's entries, or nothing at all if it could not be read. */
function readEntries(directory: string): readonly Dirent[] | undefined {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch {
    return undefined;
  }
}

/**
 * What an entry is, resolving a symlink through to its target.
 *
 * `readdirSync` reports a symlink as neither a file nor a directory, so without
 * this a symlinked document would vanish from the corpus silently. The target
 * is stated separately from a real directory so that the refusal to FOLLOW a
 * linked directory stays visible where it is decided.
 */
function kindOf(absolute: string, entry: Dirent): EntryKind {
  if (entry.isDirectory()) return 'directory';
  if (entry.isFile()) return 'file';
  if (!entry.isSymbolicLink()) return 'other';

  // `throwIfNoEntry` keeps a broken symlink from throwing; it is not a corpus
  // member and it is not a failure to enumerate either.
  const target = statSync(absolute, { throwIfNoEntry: false });
  if (target === undefined) return 'other';
  return target.isDirectory() ? 'linked-directory' : 'file';
}

/**
 * Walk one directory, appending every corpus member below it.
 *
 * Returns `false` the moment any directory in the subtree cannot be read.
 *
 * @param absolute The directory to read, as the filesystem addresses it.
 * @param relative The same directory, root-relative and `/`-separated.
 * @param into The collection being appended to.
 */
function collectInto(absolute: string, relative: string, into: string[]): boolean {
  const entries = readEntries(absolute);
  if (entries === undefined) return false;

  for (const entry of entries) {
    const childAbsolute = join(absolute, entry.name);
    const action = actionFor(kindOf(childAbsolute, entry), entry.name);

    if (action === 'collect') {
      into.push(childPath(relative, entry.name));
      continue;
    }

    if (action === 'ignore') continue;

    const read = collectInto(childAbsolute, childPath(relative, entry.name), into);
    if (!read) return false;
  }

  return true;
}

/**
 * Every corpus member under `root`, in the order the filesystem offered them.
 *
 * `undefined` means the tree could not be read — the root does not exist, is
 * not a directory, or a directory inside it refused to open. It is NEVER an
 * empty corpus: `--check` answering `invalidFiles: 0` over a mistyped root is
 * the one answer this walker exists to make impossible.
 *
 * @param root The corpus directory, exactly as the caller wrote it.
 */
export function walkTree(root: string): readonly string[] | undefined {
  const found: string[] = [];
  const read = collectInto(root, '', found);
  return read ? found : undefined;
}
