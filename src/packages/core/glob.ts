/**
 * Path matching — an entry point, and the boundary rule is what proved it.
 *
 * The characterization table pinning these semantics wanted to live against a
 * private `lib/glob.ts`, and dependency-cruiser's fourth rule forbids a test
 * from importing an internal. The right resolution was not to bend the rule:
 * `architecture.md` already says glob semantics are public behaviour a future
 * port must hit — "delegating to a runtime built-in is fine; inheriting
 * undocumented semantics from one is not, because a future port has nothing to
 * hit." Public behaviour belongs on the interface, so `matches` is an entry
 * point and its table is an ordinary test.
 *
 * The semantics themselves are `tests/glob.test.ts`. Node is the current
 * implementation of them, not the definition of them.
 */

import { matchesGlob } from 'node:path';
import type { Glob } from '../contract/config.ts';
import type { RepoPath } from '../contract/corpus.ts';

/**
 * Whether a repo-root-relative path is selected by one glob.
 *
 * `path` must already be a `RepoPath` — `/`-separated, no leading `./` or `/`.
 * Normalisation is resolution's job, and deliberately not this function's: this
 * is the pinned matching semantics and nothing else.
 */
export function matches(path: RepoPath, glob: Glob): boolean {
  return matchesGlob(path, glob);
}
