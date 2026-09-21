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
//
// What comes back is THIS MODULE'S CLAIM, or nothing. `invisible` is not
// answered here and cannot be: it says no declared Module claims the path,
// which is a statement about the whole config that only the composing Package
// can make. One Module passing a path by is not the same fact and must not be
// reported as if it were.

import { normalisePath } from '../foundation/path-shape.ts';
import type { ModuleClaim } from '../response-contract/index.ts';
import { requirementsForRule } from './lib/query/requirements.pure.ts';
import { isCorpusPath } from './lib/rules/corpus-path.pure.ts';
import { findFirstMatch } from './lib/rules/first-match.pure.ts';
import type { FrontmatterConfig } from './section.ts';

/**
 * Resolve one path against this Module's ordered rule list.
 *
 * Corpus membership is asked BEFORE the rule list, and a path the walk would
 * never have collected is passed by whatever the config says. A selector
 * carries no extension any more, so this is the only thing left that can tell
 * `notes.txt` from `notes.md` — and claiming a file `--check` will never report
 * on is the one way this command can mislead an agent about to create one.
 *
 * The path is normalised before any selector sees it and is NOT handed back:
 * the spelling the response echoes belongs to the response, and every Module
 * normalises through the one function in `foundation` rather than its own copy.
 *
 * @param path The path asked about, exactly as the caller wrote it.
 * @param section This Module's validated section, or `undefined` when its key was not written — a Module governing nothing claims no path here either.
 */
export function queryPath(path: string, section: FrontmatterConfig | undefined): ModuleClaim | undefined {
  const normalised = normalisePath(path);
  if (!isCorpusPath(normalised)) return undefined;

  const winner = findFirstMatch(normalised, section?.rules ?? []);

  if (winner === undefined) return undefined;

  return {
    rule: { ruleId: winner.ruleId, intent: winner.intent },
    requirements: requirementsForRule(winner),
  };
}
