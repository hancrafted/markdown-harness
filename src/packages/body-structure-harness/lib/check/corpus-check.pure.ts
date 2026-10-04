/**
 * Judge one corpus: which files must be opened, which Rule wins each, and what
 * each winner finds.
 *
 * A Rule that selects by `type` makes the winner a function of the file's
 * bytes (design-ADR 0012, consequence 1), so governance cannot be decided
 * before a file is opened the way the first Module decides it. What CAN be
 * decided from the path is which files no Rule reaches — those are never
 * opened — and that split is `pathsToOpen`. Everything else is decided here,
 * over sources the caller has already read.
 */

import type { ModuleCheck, ModuleFinding } from '../../../response-contract/index.ts';
import type { BodyStructureRule } from '../../section.ts';
import { documentPartsOf } from '../document/document-parts.pure.ts';
import { winnerFor } from '../rules/body-rules.pure.ts';
import { bodyViolations } from './body-violations.pure.ts';

/** One file the caller read, root-relative and normalised. */
interface Source {
  path: string;
  text: string;
}

/**
 * What this Module answers about one corpus: every governed path, and a finding
 * for each governed file with a violation, both in source order.
 *
 * Violations come depth-first in ascending level order, then spine entries in
 * entry order, so one file's report has one defined order (design-ADR 0019).
 *
 * @param sources The files `pathsToOpen` named, read, in corpus order.
 * @param rules The section's Rules, in config order.
 */
export function moduleCheckFor(sources: readonly Source[], rules: readonly BodyStructureRule[]): ModuleCheck {
  const governed: string[] = [];
  const files: ModuleFinding[] = [];

  for (const source of sources) {
    const parts = documentPartsOf(source.text);
    const winner = winnerFor(source.path, parts.type, rules);
    if (winner === undefined) continue;

    governed.push(source.path);
    const violations = bodyViolations(winner, parts.body);
    if (violations.length > 0) {
      files.push({ path: source.path, ruleId: winner.ruleId, ruleIntent: winner.intent, violations });
    }
  }

  return { governed, files };
}
