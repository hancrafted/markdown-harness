// What the config asks of one path, before anything exists there.
//
// `git check-attr` semantics: the entire input is a path string and the config.
// Nothing here touches the filesystem, so a path that does not exist and one
// that does are answered identically — an agent about to author a file cannot
// be asked to write it first and be told afterwards.
//
// Which is also why this command, and not `--check`, had to be told what a
// corpus file is once selectors stopped spelling `.md` inside a glob: there is
// no walk here to have filtered one out.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import type { QueryResult } from '../response-contract/index.ts';
import { requirementsForRule } from './lib/query/requirements.pure.ts';
import { isCorpusPath } from './lib/rules/corpus-path.pure.ts';
import { findFirstMatch } from './lib/rules/first-match.pure.ts';
import { normalisePath } from './lib/rules/path-shape.pure.ts';

/**
 * Resolve one path against the config's ordered rule list.
 *
 * Corpus membership is asked BEFORE the rule list, and a path the walk would
 * never have collected is `invisible` whatever the config says. A selector
 * carries no extension any more, so this is the only thing left that can tell
 * `notes.txt` from `notes.md` — and answering `governed` for a file `--check`
 * will never report on is the one way this command can mislead an agent about
 * to create one.
 *
 * @param path The path asked about, exactly as the caller wrote it.
 * @param config A config that has already been validated.
 */
export function queryPath(path: string, config: MarkdownHarnessConfig): QueryResult {
  const normalised = normalisePath(path);
  if (!isCorpusPath(normalised)) return { governance: 'invisible', path: normalised };

  const winner = findFirstMatch(normalised, config.frontmatter?.rules ?? []);

  if (winner === undefined) return { governance: 'invisible', path: normalised };

  return {
    governance: 'governed',
    path: normalised,
    rule: { ruleId: winner.ruleId, intent: winner.intent },
    requirements: requirementsForRule(winner),
  };
}
