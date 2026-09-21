/**
 * Whether a path could ever name a corpus file.
 *
 * Asked by the two commands that answer about a path BEFORE anything exists
 * there, and by nothing else: `--check` and `--audit` receive a corpus the walk
 * already filtered, so asking again would be a second opinion about a question
 * already settled.
 *
 * The check exists because the selector language stopped carrying the
 * extension. `path: [docs/research/**\/*.md]` spelled `.md` inside the glob, so
 * `--query docs/research/notes.txt` answered `invisible` for the accidental
 * reason that no glob matched it. `folders: [docs/research/]` carries no
 * extension at all and would answer `governed` — a change in a frozen response
 * field, arrived at by deleting the thing that used to decide it.
 *
 * The conservative answer is taken: route the two clock-free commands through
 * the SAME predicate the walk uses, so the extension lives in one place for all
 * four commands and today's answers are preserved exactly. The alternative —
 * letting a selector reach any path an Operator names — is stated in design
 * record 0007 and was not taken.
 *
 * ONE RESIDUE, NAMED. The walk also refuses `node_modules/`, `.git/` and every
 * dot-directory, and this predicate does not. A `--query` on a path inside one
 * of those answers about the config rather than about the corpus, where
 * `--check` would never have reported the file at all. That is narrower than
 * the extension gap and is left open deliberately: it is a fact about the walk
 * rather than about a file name, and reproducing it here would be a second
 * copy of the refusals the corpus walk in `foundation` exists to own.
 */

import { isMarkdownFile } from '../../../foundation/corpus-membership.ts';
import { fileNameOf } from './selector.pure.ts';

/**
 * Whether the corpus walk would have collected this path.
 *
 * @param path A normalised, repo-root-relative path. It need not exist.
 */
export function isCorpusPath(path: string): boolean {
  return isMarkdownFile(fileNameOf(path));
}
