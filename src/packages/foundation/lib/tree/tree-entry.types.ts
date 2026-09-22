/**
 * The seam between reading a directory and deciding what to do with what it
 * held.
 *
 * The walker must ask the filesystem what an entry is, and that answer is the
 * one thing the decision cannot derive from a name. Naming the two vocabularies
 * lets the decision stay deterministic and testable without a filesystem.
 */

/**
 * What one directory entry turned out to be, once a symlink is resolved through.
 *
 * `linked-directory` is its own case rather than a `directory`: the
 * specification says symlinked directories are NOT followed, and collapsing the
 * two would make that rule invisible at the point it is applied.
 */
export type EntryKind = 'directory' | 'linked-directory' | 'file' | 'other';

/** What the walker does with one entry. */
export type EntryAction = 'collect' | 'descend' | 'ignore';
