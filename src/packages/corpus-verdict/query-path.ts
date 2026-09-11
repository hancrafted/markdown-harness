// What the whole config asks of one path, before anything exists there.
//
// `git check-attr` semantics: the entire input is a path string and the config.
// Nothing here touches the filesystem, so a path that does not exist and one
// that does are answered identically — an agent about to author a file cannot
// be asked to write it first and be told afterwards.
//
// This is where `invisible` is decided, and it is the one verdict no Module may
// reach on its own. "No rule names this path" used to be a claim about one rule
// list; with two Modules it is a claim about every rule list at once, and only
// a caller holding both answers is entitled to make it.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { queryNames } from '../file-names-harness/query.ts';
import { queryFrontmatter } from '../frontmatter-harness/query.ts';
import { normalisePath } from '../markdown-file-tree/normalise-path.ts';
import type { ModuleGovernance, QueryResult } from '../response-contract/index.ts';

/**
 * Resolve one path against every Module the config declares.
 *
 * EVERY governing Module is listed, including one whose requirements the path
 * already satisfies — unlike `--check`, which lists only Modules with findings.
 * The difference is what each command is for: the path may not exist yet, so
 * "already satisfies" is not yet a fact about anything, and telling an agent
 * only about the Modules it is currently failing would withhold the naming rule
 * from exactly the agent that is about to choose a name.
 *
 * The array order is the order `MarkdownHarnessConfig` declares its keys, never
 * the order the YAML mapping used.
 *
 * @param path The path asked about, exactly as the caller wrote it.
 * @param config A config that has already been validated.
 */
export function queryPath(path: string, config: MarkdownHarnessConfig): QueryResult {
  const normalised = normalisePath(path);

  const answered: readonly (ModuleGovernance | undefined)[] = [
    queryFrontmatter(normalised, config),
    queryNames(normalised, config),
  ];
  const modules = answered.filter((one): one is ModuleGovernance => one !== undefined);

  if (modules.length === 0) return { governance: 'invisible', path: normalised };

  return { governance: 'governed', path: normalised, modules };
}
