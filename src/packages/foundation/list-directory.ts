// What is directly inside one directory, by name, sorted.
//
// A second entry point rather than a second export on `list-markdown-files.ts`,
// because it answers a different question. That file enumerates a CORPUS — a
// tree, filtered by what the corpus admits, root-relative. This one answers
// about one directory's own entries, which is how a tier is discovered and how
// a runner's claim is read off the tree rather than off a hand-written list.
//
// It answers rather than throws, like every other read through this gate.
// `undefined` means the directory could not be opened at all, which is a
// different answer from an empty one — and the callers that would rather die
// than continue say so themselves, where a reader can see the sentence.

import { readHostDirectory } from './lib/platform/node-host.impure.ts';

/**
 * Every immediate subdirectory of `dir`, by name, sorted.
 *
 * A symlinked directory is NOT one: the entry's own kind decides, with nothing
 * followed, which is the same reading the corpus walk takes.
 *
 * @param dir The directory to list, as a host path.
 */
export function directoryNamesIn(dir: string): readonly string[] | undefined {
  return namesOfKind(dir, 'directory');
}

/**
 * Every immediate file of `dir`, by name, sorted.
 *
 * @param dir The directory to list, as a host path.
 */
export function fileNamesIn(dir: string): readonly string[] | undefined {
  return namesOfKind(dir, 'file');
}

/** One listing, narrowed to a kind and ordered, or the refusal passed through. */
function namesOfKind(dir: string, kind: 'directory' | 'file'): readonly string[] | undefined {
  const entries = readHostDirectory(dir);
  if (entries === undefined) return undefined;

  return entries
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.name)
    .sort();
}
