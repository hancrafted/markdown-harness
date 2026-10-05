/**
 * Judge one corpus: which files must be opened, which Rule wins each, and what
 * each winner finds.
 *
 * A Rule that selects by `type` makes the winner a function of the file's
 * bytes, so governance cannot be decided
 * before a file is opened the way the first Module decides it. What CAN be
 * decided from the path is which files no Rule reaches — those are never
 * opened — and that split is `pathsToOpen`. Everything else is decided here,
 * over documents the caller has already read.
 */

import type { CorpusDocument } from '../../../foundation/read-corpus.ts';
import type { ModuleCheck, ModuleFinding } from '../../../response-contract/index.ts';
import type { BodyStructureRule } from '../../section.ts';
import { documentTypeOf } from '../document/document-type.pure.ts';
import { winnerFor } from '../rules/body-rules.pure.ts';
import { bodyViolations } from './body-violations.pure.ts';
import type { BodyStructureViolation } from './violation.types.ts';

/**
 * What this Module answers about one corpus: every governed path, and a finding
 * for each governed file with a violation, both in source order.
 *
 * Violations come depth-first in ascending level order, then spine entries in
 * entry order, so one file's report has one defined order.
 *
 * @param documents The files `pathsToOpen` named, read, in corpus order.
 * @param rules The section's Rules, in config order.
 */
export function moduleCheckFor(
  documents: readonly CorpusDocument[],
  rules: readonly BodyStructureRule[],
): ModuleCheck<BodyStructureViolation> {
  const governed: string[] = [];
  const files: ModuleFinding<BodyStructureViolation>[] = [];

  for (const document of documents) {
    const winner = winnerFor(document.path, documentTypeOf(document.frontmatter), rules);
    if (winner === undefined) continue;

    governed.push(document.path);
    const violations = bodyViolations(winner, document.body);
    if (violations.length > 0) {
      files.push({ path: document.path, ruleId: winner.ruleId, ruleIntent: winner.intent, violations });
    }
  }

  return { governed, files };
}
