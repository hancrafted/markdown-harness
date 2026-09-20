// What the config asks of one path, before anything exists there.
//
// `git check-attr` semantics: the entire input is a path string and the config.
// Nothing here touches the filesystem, so a path that does not exist and one
// that does are answered identically — an agent about to author a file cannot
// be asked to write it first and be told afterwards.

import type { QueryResult } from '../response-contract/index.ts';
import { requirementsForRule } from './lib/query/requirements.pure.ts';
import { findFirstMatch } from './lib/rules/first-match.pure.ts';
import { normalisePath } from './lib/rules/path-shape.pure.ts';
import type { FrontmatterConfig } from './section.types.ts';

/**
 * Resolve one path against the frontmatter module's ordered rule list.
 *
 * @param path The path asked about, exactly as the caller wrote it.
 * @param section A frontmatter section that has already been validated, or undefined.
 */
export function queryPath(path: string, section: FrontmatterConfig | undefined): QueryResult {
  const normalised = normalisePath(path);
  const winner = findFirstMatch(normalised, section?.rules ?? []);

  if (winner === undefined) return { governance: 'invisible', path: normalised };

  return {
    governance: 'governed',
    path: normalised,
    modules: [
      {
        module: 'frontmatter',
        rule: { ruleId: winner.ruleId, intent: winner.intent },
        requirements: requirementsForRule(winner),
      },
    ],
  };
}
