/**
 * Path normalisation, done once before anything matches.
 *
 * `matchesGlob` rejects `./docs/a.md` against `docs/**`, and a Windows caller
 * hands over backslashes, so a `RepoPath` is defined rather than assumed:
 * `/`-separated, no leading `./`, no leading `/`.
 */

import type { RepoPath } from '../../../contract/corpus.ts';
import type { PathKind } from '../../../contract/steering-answer.ts';

export function normalize(path: string): RepoPath {
  return path
    .replaceAll('\\', '/')
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '');
}

/**
 * Whether a path names a file or a folder, decided from its LAST SEGMENT ALONE.
 *
 * `query` never touches disk — that is the `git check-attr` seam — so a folder
 * and an extensionless file are indistinguishable here and there is nothing to
 * go on but the spelling. A path is a folder unless its last segment carries an
 * extension, which makes folder the default.
 *
 * Two cases it gets wrong, both the same shape and both unfixable without
 * looking: a directory whose own name contains a dot. `docs/v1.2` and
 * `docs/.claude` read as files.
 */
export function pathKind(path: RepoPath): PathKind {
  const last = path.split('/').at(-1) ?? '';
  return /\.[^./]+$/.test(last) ? 'file' : 'folder';
}

/**
 * A path as resolution should see it: a folder always carries exactly one
 * trailing slash.
 *
 * Not cosmetic. `docs/research` does not match `docs/research/**` and
 * `docs/research/` does, so without this the most specific rule for a folder is
 * not a candidate at all, and a config whose only rule is `docs/research/**`
 * answers `governs: null` — "invisible" — about a folder whose files it plainly
 * governs. The trailing form strictly dominates: it matches everywhere the bare
 * path does, plus `X/**`.
 *
 * The full measured basis, including the two residuals it does NOT fix, is the
 * folder section of `core/tests/glob.test.ts`.
 */
export function forResolution(path: RepoPath, kind: PathKind): RepoPath {
  if (kind === 'file') return path;
  return `${path.replace(/\/+$/, '')}/`;
}
