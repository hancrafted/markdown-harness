/**
 * Which files a single rule claims.
 *
 * A selector is two literal axes: folders and file names.
 * Overlap and selection are decided with no tree read (design-ADR 0007).
 */

import type { Selector } from '../../../config-contract/index.ts';
import type { FrontmatterRule } from '../../section.types.ts';
import type { RuleSelection } from './rules.types.ts';

/**
 * Split a repo-root-relative path into its folder token and file name token.
 * A folder token carries a mandatory trailing `/`, and the root is `./`.
 *
 * @param path A normalised, repo-root-relative path.
 */
export function splitPath(path: string): { folder: string; fileName: string } {
  const slashIndex = path.lastIndexOf('/');
  if (slashIndex === -1) {
    return { folder: './', fileName: path };
  }
  return {
    folder: path.slice(0, slashIndex + 1),
    fileName: path.slice(slashIndex + 1),
  };
}

function matchesFolderAxis(selector: Selector, folder: string): boolean {
  const folders = selector.folders ?? [];
  const trees = selector.folderTrees ?? [];
  if (folders.length === 0 && trees.length === 0) return true;
  return folders.includes(folder) || trees.some((tree) => folder.startsWith(tree));
}

function matchesNameAxis(selector: Selector, fileName: string): boolean {
  const names = selector.fileNames ?? [];
  if (names.length === 0) return true;
  return names.includes(fileName);
}

/**
 * Whether a selector matches a given file path.
 *
 * @param selector The Selector to match against.
 * @param path The normalised, repo-root-relative path.
 */
export function selectorMatchesPath(selector: Selector, path: string): boolean {
  const { folder, fileName } = splitPath(path);
  return matchesFolderAxis(selector, folder) && matchesNameAxis(selector, fileName);
}

/**
 * What this rule did with this path.
 *
 * @param rule The rule under test.
 * @param path A normalised, repo-root-relative path.
 */
export function selectionFor(rule: FrontmatterRule, path: string): RuleSelection {
  const ruleSelector: Selector = {
    folders: rule.folders,
    folderTrees: rule.folderTrees,
    fileNames: rule.fileNames,
  };

  const matched = selectorMatchesPath(ruleSelector, path);
  if (!matched) return 'unselected';

  const excluded = (rule.excludeFiles ?? []).some((sel) => selectorMatchesPath(sel, path));
  return excluded ? 'excluded' : 'selected';
}

/**
 * Whether this rule claims this path.
 *
 * @param rule The rule under test.
 * @param path A normalised, repo-root-relative path.
 */
export function ruleSelects(rule: FrontmatterRule, path: string): boolean {
  return selectionFor(rule, path) === 'selected';
}
