/**
 * Turning the match matrix into `coverage`.
 *
 * Folded from the SAME resolutions the file walk used, never recomputed. Two
 * passes over the rule list could disagree about which rule won a file, and a
 * coverage table that disagrees with the report it sits in is worse than no
 * coverage table at all.
 */

import type { RuleCoverage } from '../../../contract/check-report.ts';
import type { FrontmatterRule } from '../../../contract/config.ts';
import { ruleRef, type Resolution } from './select.ts';

/** One row per rule, in config order — including every rule that governed nothing. */
export function tally(rules: readonly FrontmatterRule[], resolutions: readonly Resolution[]): readonly RuleCoverage[] {
  return rules.map((_, index) => row(rules, index, resolutions));
}

function row(rules: readonly FrontmatterRule[], index: number, resolutions: readonly Resolution[]): RuleCoverage {
  const counted = { won: 0, shadowed: 0, excluded: 0 };
  const shadowedBy = new Set<string>();

  for (const { outcomes, winner } of resolutions) {
    const outcome = outcomes[index];
    // `unmatched` is the overwhelming majority and carries no information: a
    // rule that never selected a path was never in the running for it.
    if (outcome === 'unmatched') continue;
    counted[outcome] += 1;
    if (outcome === 'shadowed' && winner !== null) shadowedBy.add(winner.ruleId);
  }

  return {
    rule: ruleRef(rules[index]),
    won: counted.won,
    shadowed: counted.shadowed,
    // Filtered out of the rule list rather than read off the Set, so the order
    // is CONFIG order by construction: a shadower always sits above, so this
    // reads as "look at these, in this order". Set insertion order would have
    // been corpus order, which is somebody's directory listing.
    shadowedBy: rules.filter((rule) => shadowedBy.has(rule.ruleId)).map((rule) => rule.ruleId),
    excluded: counted.excluded,
  };
}
