/**
 * What `--query` answers for a path not yet written: every Rule that could win
 * it (design-ADR 0019).
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
 * its `types`, `maxLevel` and `headings` copied verbatim, an omitted key staying
 * omitted — the Steering payload, every heading `intent` included.
 */

import type { BodyStructureRequirements, ModuleClaim } from '../../../response-contract/index.ts';
import type { BodyStructureRule } from '../../section.ts';
import { reaches } from '../rules/selection.pure.ts';

/** One Rule's requirements as written, a key it never wrote left out. */
function requirementsOf(rule: BodyStructureRule): BodyStructureRequirements {
  return {
    ...(rule.types === undefined ? {} : { types: rule.types }),
    ...(rule.maxLevel === undefined ? {} : { maxLevel: rule.maxLevel }),
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
  const reaching = rules.filter((rule) => reaches(rule, path));
  const last = reaching.findIndex((rule) => rule.types === undefined);
  const candidates = last === -1 ? reaching : reaching.slice(0, last + 1);

  return candidates.map((rule) => ({
    rule: { ruleId: rule.ruleId, intent: rule.intent },
    requirements: requirementsOf(rule),
  }));
}
