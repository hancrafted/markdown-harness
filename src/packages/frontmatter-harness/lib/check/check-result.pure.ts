/**
 * One Module's answer about one corpus: the governed list, and what it
 * found there.
 *
 * NOT the response. The three counts used to be computed here and are not any
 * more: `governedFiles` is a union across Modules, and a Module that cannot see
 * the others cannot take it — two Modules' own tallies added together would
 * report one file twice. The arithmetic moved to `cli`, which is the only
 * Package that sees every Module (ARCH-008 §4.1), and what this file hands back
 * is the two facts it is taken over.
 *
 * Nothing here names this Module. The key that reaches the report is read from
 * the descriptor at composition, so a report cannot go on saying `frontmatter`
 * after the Operator renamed nothing and a second Module arrived.
 */

import type { ModuleCheck, ModuleFinding } from '../../../response-contract/index.ts';
import type { GovernedSource } from './check.types.ts';
import { violationsForFile } from './file-verdict.pure.ts';

/** How many findings one file contributed. */
function countIn(finding: ModuleFinding): number {
  return finding.violations.length;
}

/**
 * Judge every governed file that has been read.
 *
 * The governed list is the INPUT's paths rather than a separate tally: every
 * governed file was read, and only the ones with findings survive into `files`.
 * That is what makes the governed list the fact not recoverable from the findings.
 *
 * @param sources Every governed file with its bytes, in walker order.
 */
export function moduleCheckFor(sources: readonly GovernedSource[]): ModuleCheck {
  const files = sources
    .map((source) => ({
      path: source.path,
      ruleId: source.rule.ruleId,
      ruleIntent: source.rule.intent,
      violations: violationsForFile(source.text, source.rule),
    }))
    .filter((finding) => countIn(finding) > 0);

  return { governed: sources.map((source) => source.path), files };
}
