/**
 * This Module's verdict on every governed file it read.
 *
 * The arithmetic that used to live here has moved one tier up, to the composer
 * that can see every Module at once. That is not a relocation of convenience:
 * `summary.governedFiles` is the UNION across Modules, and a Module computing
 * it from its own `sources.length` would be stating a number about a corpus it
 * only half looked at. What is left here is the part this Module genuinely
 * owns — which rule won each file, and what that rule found.
 *
 * Conforming files are kept, with an empty `violations`. The composer drops
 * them from the report and counts them in `governedFiles`, and it can only do
 * the second if this function hands them over.
 */

import type { FrontmatterOutcome, GovernedSource } from './check.types.ts';
import { violationsForFile } from './file-verdict.pure.ts';

/**
 * This Module's own config key, carried on every block it produces.
 *
 * The CONFIG KEY and never the Package name: `frontmatter`, not
 * `frontmatter-harness`. The key is the word an Operator already wrote and can
 * grep for; the Package name is an implementation detail the response contract
 * has no business exposing.
 */
const MODULE = 'frontmatter';

/**
 * Judge every governed file that has been read.
 *
 * @param sources Every governed file with its bytes, in walker order.
 */
export function frontmatterOutcomes(sources: readonly GovernedSource[]): readonly FrontmatterOutcome[] {
  return sources.map((source) => ({
    path: source.path,
    findings: {
      module: MODULE,
      ruleId: source.rule.ruleId,
      ruleIntent: source.rule.intent,
      violations: violationsForFile(source.text, source.rule),
    },
  }));
}
