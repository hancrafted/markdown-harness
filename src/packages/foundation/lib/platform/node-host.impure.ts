/**
 * The one file in this repository that imports a platform builtin.
 *
 * Everything below is a thin translation of a Node call into a shape from
 * `./node-host.types.ts`. Nothing here decides anything: which errno means
 * absence is `../read/read-outcome.pure.ts`'s rule, what the walk does with an
 * entry is `../tree/corpus-entry.pure.ts`'s, and whether a resolved target is
 * still inside the corpus is `../tree/containment.pure.ts`'s. This file exists
 * so those three can be read, tested and argued with away from the syscalls.
 *
 * NOTHING HERE THROWS. Every call that can fail answers instead, because a
 * throw crossing this boundary would put the caller's policy back inside the
 * platform: a broken symlink, a directory standing where a file was expected
 * and a corpus root that does not exist are three different answers, and a
 * stack trace is the same answer for all of them.
 *
 * ARCH-008 §2.2 holds the placement — `gate-builtins-sit-in-platform` in
 * `.dependency-cruiser.cjs` fires on a builtin import anywhere else inside this
 * Package, and `only-the-gate-imports-a-builtin` fires on one in any other
 * Package.
 */

import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HostEntry, HostEntryKind, HostRead } from './node-host.types.ts';

/**
 * Read one file as text, or say why not.
 *
 * A single `readFileSync` covers absence, directories and permission refusals
 * alike: a separate `stat` first would open a window in which the answer
 * changes between the two calls, and would still have to interpret the same
 * errno at the end.
 *
 * @param location A host path, exactly as the caller assembled it.
 */
export function readHostFile(location: string): HostRead {
  try {
    return { kind: 'text', text: readFileSync(location, 'utf8') };
  } catch (error) {
    return { kind: 'failed', errorCode: (error as { code?: string }).code };
  }
}

/**
 * Every entry directly inside one directory, or `undefined` where it could not
 * be opened at all.
 *
 * `withFileTypes` is what keeps this one syscall rather than one per entry, and
 * the kinds it reports are about the ENTRY, never about a symlink's target.
 *
 * @param location A host path to a directory.
 */
export function readHostDirectory(location: string): readonly HostEntry[] | undefined {
  try {
    return readdirSync(location, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      kind: entryKindOf(entry.isDirectory(), entry.isFile(), entry.isSymbolicLink()),
    }));
  } catch {
    return undefined;
  }
}

/** Fold the three predicates a `Dirent` answers into one word. */
function entryKindOf(directory: boolean, file: boolean, symlink: boolean): HostEntryKind {
  if (directory) return 'directory';
  if (file) return 'file';
  return symlink ? 'symlink' : 'other';
}

/**
 * What sits at the END of a symlink, or `undefined` where nothing does.
 *
 * `throwIfNoEntry: false` covers a broken link and nothing else — a symlink
 * chain that closes on itself raises `ELOOP` from `statSync` and would
 * otherwise propagate out of the walk as a stack trace. Catching it here is
 * one of the two mechanisms that make a corpus cycle a report.
 *
 * @param location A host path, which may or may not be a symlink.
 */
export function resolvedKindOf(location: string): HostEntryKind | undefined {
  try {
    const target = statSync(location, { throwIfNoEntry: false });
    if (target === undefined) return undefined;
    return entryKindOf(target.isDirectory(), target.isFile(), false);
  } catch {
    return undefined;
  }
}

/**
 * The real path one location names, with every symlink and `..` resolved, or
 * `undefined` where it cannot be resolved at all.
 *
 * Both sides of a containment question go through this, the corpus root
 * included. On macOS a temporary directory is reached through `/var`, which is
 * itself a symlink to `/private/var` — so comparing an unresolved root against
 * a resolved target would report every file in such a tree as an escape.
 *
 * @param location A host path.
 */
export function realHostPath(location: string): string | undefined {
  try {
    return realpathSync(location);
  } catch {
    return undefined;
  }
}

/**
 * Join a root and the segments below it into one host path.
 *
 * The host separator is the whole reason this is here rather than at a call
 * site: it differs across platforms, so it is an ambient read, and a caller
 * assembling one is a caller reaching past the gate.
 *
 * @param root The directory the segments are relative to.
 * @param segments Path segments below it, in order.
 */
export function hostPathOf(root: string, segments: readonly string[]): string {
  return join(root, ...segments);
}

/**
 * Collapse equivalent host-path spellings without resolving a filesystem target.
 *
 * @param location A host path whose spelling may contain redundant segments.
 */
export function normaliseHostPath(location: string): string {
  return normalize(location);
}

/**
 * The directory the module at `moduleUrl` sits in.
 *
 * `import.meta.url` is the only address a module has for itself that survives
 * both a working directory it was not started from and a compile into `dist/`.
 * The trailing slash on `'.'` is load-bearing: without it the last segment
 * would be replaced rather than descended into.
 *
 * @param moduleUrl A module's own `import.meta.url`.
 */
export function directoryOfModule(moduleUrl: string): string {
  return fileURLToPath(new URL('.', moduleUrl));
}

/** The filename of the module at `moduleUrl`. */
export function fileNameOfModule(moduleUrl: string): string {
  return basename(fileURLToPath(moduleUrl));
}
