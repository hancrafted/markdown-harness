/**
 * Path normalisation, done once before anything matches.
 *
 * `matchesGlob` rejects `./docs/a.md` against `docs/**`, and a Windows caller
 * hands over backslashes, so a `RepoPath` is defined rather than assumed:
 * `/`-separated, no leading `./`, no leading `/`.
 */

import type { RepoPath } from '../../../contract/corpus.ts';

export function normalize(path: string): RepoPath {
  return path
    .replaceAll('\\', '/')
    .replace(/^(\.\/)+/, '')
    .replace(/^\/+/, '');
}
