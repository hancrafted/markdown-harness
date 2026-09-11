// What this Module asks of one path, before anything exists there.
//
// `git check-attr` semantics: the entire input is a path string and the config.
// Nothing here touches the filesystem, so a path that does not exist and one
// that does are answered identically — an agent about to author a file cannot
// be asked to write it first and be told afterwards.
//
// It answers for the `frontmatter` Module ALONE, and `undefined` is its way of
// saying "not mine". Deciding that a path is invisible is a claim about every
// Module at once, so it is made one tier up, by `corpus-verdict`.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { normalisePath } from '../markdown-file-tree/normalise-path.ts';
import type { FrontmatterGovernance } from '../response-contract/index.ts';
import { requirementsForRule } from './lib/query/requirements.pure.ts';
import { findFirstMatch } from './lib/rules/first-match.pure.ts';
import { matchGlob } from './lib/rules/glob-match.impure.ts';

/** This Module's own config key, never its Package name. */
const MODULE = 'frontmatter';

/**
 * Resolve one path against this Module's ordered rule list.
 *
 * `undefined` means no rule of THIS Module selected the path. The path may
 * still be governed — by a naming rule, for instance — which is exactly why
 * this function no longer returns `{ governance: 'invisible' }`: it is not
 * entitled to that verdict any more.
 *
 * @param path The path asked about, exactly as the caller wrote it.
 * @param config A config that has already been validated.
 */
export function queryFrontmatter(path: string, config: MarkdownHarnessConfig): FrontmatterGovernance | undefined {
  const winner = findFirstMatch(normalisePath(path), config.frontmatter?.rules ?? [], matchGlob);
  if (winner === undefined) return undefined;

  return {
    module: MODULE,
    rule: { ruleId: winner.ruleId, intent: winner.intent },
    requirements: requirementsForRule(winner),
  };
}
