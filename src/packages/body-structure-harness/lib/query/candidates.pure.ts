/**
 * What `--query` answers for a path not yet written: every Rule that could win
 * it (design-ADR 0019, 0025).
 *
 * The command opens no file, so it cannot know the `type` a file does not yet
 * have. It answers the Rules that REACH the path — folder and file-name axes
 * matching, own exclusion not removing it — in config order, ENDING at the
 * first of them that carries no `types`: that Rule wins every type, so
 * anything after it is unreachable from the path alone. A Rule whose
 * exclusion removes the path is not a candidate, so it neither appears nor
 * ends the list.
 *
 * Each candidate is one claim (design-ADR 0019 amending 0011): the Rule, and
 * its `types`, `maxLevel`, `undefinedHeadings`, `vocabulary` and `headings` copied verbatim, an omitted
 * key staying omitted — the Steering payload, every heading `intent` and `mayHold` included, so an agent
 * about to write the file learns the titles a level may take and what each section may hold
 * (design-ADR 0027, 0028).
 */

import type { BodyStructureRequirements, ModuleClaim } from '../../../response-contract/index.ts';
import type { BodyStructureRule } from '../../section.ts';
import { candidatesFor } from '../rules/body-rules.pure.ts';

/** One Rule's requirements as written, a key it never wrote left out. */
function requirementsOf(rule: BodyStructureRule): BodyStructureRequirements {
  return {
    ...(rule.types === undefined ? {} : { types: rule.types }),
    ...(rule.maxLevel === undefined ? {} : { maxLevel: rule.maxLevel }),
    ...(rule.undefinedHeadings === undefined ? {} : { undefinedHeadings: rule.undefinedHeadings }),
    ...(rule.vocabulary === undefined ? {} : { vocabulary: rule.vocabulary }),
    ...(rule.headings === undefined ? {} : { headings: rule.headings }),
  };
}

/**
 * Every candidate Rule for one path, as claims, in config order.
 *
 * @param path A normalised, root-relative corpus path.
 * @param rules The section's Rules, in config order.
 */
export function candidateClaims(path: string, rules: readonly BodyStructureRule[]): readonly ModuleClaim[] {
  return candidatesFor(path, rules).map((rule) => ({
    rule: { ruleId: rule.ruleId, intent: rule.intent },
    requirements: requirementsOf(rule),
  }));
}
