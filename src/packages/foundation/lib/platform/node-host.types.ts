/**
 * What the host hands back, in this repository's own words.
 *
 * Every shape here exists so that `node-host.impure.ts` is the only file that
 * ever names a platform type. A `Dirent` or an `ErrnoException` escaping into
 * the Package would make the builtin reachable by type from anywhere, and a
 * type-only edge is exactly the one `tsPreCompilationDeps` was turned on to
 * see — so the gate would hold at the import graph and leak at the compiler.
 */

/**
 * What one directory entry is, WITHOUT resolving a symlink through it.
 *
 * `symlink` is its own case rather than folded into `file` or `directory`,
 * because it is the only kind whose target has to be located before anything
 * can be decided about it: containment is a question about where it points,
 * and no answer about the link itself supplies that.
 */
export type HostEntryKind = 'directory' | 'file' | 'symlink' | 'other';

/** One directory entry: its own name, never a path, and what it is. */
export interface HostEntry {
  /** The entry's own name, as the host spelled it. */
  name: string;
  /** What the entry is, with no symlink followed. */
  kind: HostEntryKind;
}

/**
 * The outcome of one read, with the platform's own errno still attached.
 *
 * The errno travels no further than `read-outcome.pure.ts`, which is where
 * this repository decides what an errno means. Keeping it in the shape rather
 * than interpreting it here is what leaves that decision testable without a
 * filesystem.
 */
export type HostRead =
  /** The file's contents. */
  | { kind: 'text'; text: string }
  /** The read failed, carrying whatever the platform called it. */
  | { kind: 'failed'; errorCode: string | undefined };
