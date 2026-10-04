/**
 * Judge one corpus: which files must be opened, which Rule wins each, and what
 * each winner finds.
 *
 * A Rule that selects by `type` makes the winner a function of the file's
 * bytes (design-ADR 0012, consequence 1), so governance cannot be decided
 * before a file is opened the way the first Module decides it. What CAN be
 * decided from the path is which files no Rule reaches — those are never
 * opened — and that split is `pathsToRead`. Everything else is decided here,
 * over sources the caller has already read.
 */

import { reaches } from '../../../foundation/rule-selection.ts';
import type { ModuleCheck, ModuleFinding } from '../../../response-contract/index.ts';
import type { BodyStructureRule } from '../../section.ts';
import { documentPartsOf } from '../document/document-parts.pure.ts';
import { outlineOf } from '../document/outline.pure.ts';
import { firstMatch } from '../rules/selection.pure.ts';
import { headingEntryViolations } from './heading-entries.pure.ts';
import { levelViolations } from './level-depth.pure.ts';

/** One file the caller read, root-relative and normalised. */
interface Source {
  path: string;
  text: string;
}

/**
 * Every path some Rule reaches, in corpus order — the files a check must open.
 * A path no Rule reaches is never opened.
 *
 * @param paths The corpus, normalised, in walker order.
 * @param rules The section's Rules, in config order.
 */
export function pathsToRead(paths: readonly string[], rules: readonly BodyStructureRule[]): readonly string[] {
  return paths.filter((path) => rules.some((rule) => reaches(rule, path)));
}

/**
 * What this Module answers about one corpus: every governed path, and a finding
 * for each governed file with a violation, both in source order.
 *
 * Violations come depth-first in ascending level order, then spine entries in
 * entry order, so one file's report has one defined order (design-ADR 0019).
 *
 * @param sources The files `pathsToRead` named, read, in corpus order.
 * @param rules The section's Rules, in config order.
 */
export function moduleCheckFor(sources: readonly Source[], rules: readonly BodyStructureRule[]): ModuleCheck {
  const governed: string[] = [];
  const files: ModuleFinding[] = [];

  for (const source of sources) {
    const parts = documentPartsOf(source.text);
    const winner = firstMatch(source.path, parts.type, rules);
    if (winner === undefined) continue;

    governed.push(source.path);
    const outline = outlineOf(parts.body);
    const violations = [
      ...levelViolations(winner.maxLevel, outline),
      ...headingEntryViolations(winner.headings, outline),
    ];
    if (violations.length > 0) {
      files.push({ path: source.path, ruleId: winner.ruleId, ruleIntent: winner.intent, violations });
    }
  }

  return { governed, files };
}
