/**
 * What the walker admits, decided from one entry's name and kind alone.
 *
 * The two named refusals are the whole safety story rather than a convenience.
 * Measured against the platform matcher: `node_modules/x.md` DOES match
 * `**\/*.md`, so nothing downstream would have removed it — no rule, no later
 * filter. `.git/x.md` does not match, because `*` refuses a leading dot, so
 * that one is covered twice. Both are named anyway: the specification makes
 * them unconditional, and a guarantee resting on a glob subtlety is not one.
 *
 * Nothing here takes a config, and nothing upstream offers one. "No config can
 * opt back in" is therefore a property of the call graph rather than a check
 * that could regress.
 */

import type { EntryAction, EntryKind } from './tree-entry.types.ts';

/** Directory names refused outright, at any depth, whatever a config says. */
const REFUSED_DIRECTORIES: readonly string[] = ['node_modules', '.git'];

/** The one extension the corpus is made of. */
const MARKDOWN_EXTENSION = '.md';

/** The character that keeps an entry out of a `*` expansion. */
const DOT = '.';

/**
 * Whether the walker descends into a directory.
 *
 * Dot-directories are refused wholesale, the way `*` refuses a leading dot, so
 * an adopter's `.claude/` and `.archgate/` stay out of the corpus without
 * either being named here. The two unconditional refusals are named above
 * because they must hold whether or not they start with a dot.
 *
 * @param name A single directory name, never a path.
 */
export function walksInto(name: string): boolean {
  const refusedByName = REFUSED_DIRECTORIES.includes(name);
  if (refusedByName) return false;
  return !name.startsWith(DOT);
}

/**
 * Whether a file belongs to the corpus.
 *
 * Case-SENSITIVE, and deliberately not a call to the platform matcher. That
 * matcher turns case-insensitive for any path segment whose pattern holds a
 * wildcard: `*.md` matches `README.MD` there, while the literal `index.md` does
 * not match `INDEX.MD`. Inheriting that would leave the corpus definition
 * disagreeing with itself about case depending on how a glob was written.
 * Lowercase `.md` is the convention every markdown tool already holds, and it
 * answers the same on every platform — which is what lets a stored response
 * compare equal on another machine.
 *
 * A leading dot is refused for the same reason a dot-directory is, which also
 * disposes of a file named exactly `.md`.
 *
 * @param name A single file name, never a path.
 */
export function isMarkdownFile(name: string): boolean {
  if (name.startsWith(DOT)) return false;
  return name.endsWith(MARKDOWN_EXTENSION);
}

/**
 * What the walker does with one entry.
 *
 * The whole decision, in one deterministic place, so that the recursion around
 * it reads as a sequence of steps rather than as a nest of rules. A
 * `linked-directory` is ignored rather than descended into: following one could
 * leave the tree entirely, or revisit it, and the specification refuses it
 * outright. A symlink to a FILE is collected, because a repository that
 * symlinks a document — this one symlinks `CLAUDE.md` to `AGENTS.md` — would
 * otherwise have that document silently ungoverned, which is the false clean a
 * trust tool cannot afford.
 *
 * @param kind What the entry turned out to be.
 * @param name The entry's own name, never a path.
 */
export function actionFor(kind: EntryKind, name: string): EntryAction {
  if (kind === 'file') return isMarkdownFile(name) ? 'collect' : 'ignore';
  if (kind === 'directory') return walksInto(name) ? 'descend' : 'ignore';
  return 'ignore';
}
