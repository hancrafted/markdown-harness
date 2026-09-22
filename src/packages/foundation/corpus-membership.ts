// What counts as a corpus file, for callers that have no tree to walk.
//
// A second entry point rather than a second export on `list-markdown-files.ts`,
// because it answers a different question: that file enumerates a tree, this
// one decides membership from a name alone. A caller asking "would the walk
// have collected this?" about a path that does not exist has no tree to offer.
//
// This exists because the selector language stopped carrying the extension.
// While a selector was a glob, `.md` was spelled inside it, so `--query` on
// `notes.txt` answered `invisible` because no glob matched it. Under two
// literal axes there is no extension anywhere, and a folder token would reach
// `notes.txt` as readily as `notes.md` — a real, measured change in a frozen
// response field. Rather than let the corpus definition fork, the walk's
// predicate is published here as `isCorpusPath`. See
// `docs/design-adr/0007-selector-is-two-literal-axes.md`.

import { isMarkdownFile } from './lib/tree/corpus-entry.pure.ts';
import { fileNameOf } from './selector-grammar.ts';

/**
 * Whether the corpus walk would collect a normalised path.
 *
 * @param path A normalised, repo-root-relative path. It need not exist.
 */
export function isCorpusPath(path: string): boolean {
  return isMarkdownFile(fileNameOf(path));
}
