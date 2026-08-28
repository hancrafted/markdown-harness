/**
 * Turning the match matrix into `coverage`.
 *
 * Folded from the SAME resolutions the file walk used, never recomputed. Two
 * passes over the rule list could disagree about which rule won a file, and a
 * coverage table that disagrees with the report it sits in is worse than no
 * coverage table at all.
 */

import type { FrontmatterRule } from '../../../contract/config.ts';
import type { RuleCoverage } from '../../../contract/coverage-result.ts';
import { ruleRef, type Resolution } from './select.ts';

/** What one rule accumulates across the corpus, before it becomes a row. */
interface Counts {
  won: number;
  shadowed: number;
  excluded: number;
  shadowedBy: Set<string>;
}

function blank(): Counts {
  return { won: 0, shadowed: 0, excluded: 0, shadowedBy: new Set() };
}

/**
 * One row per rule, in config order — including every rule that governed nothing.
 *
 * Accumulated BY `ruleId`, which the config language requires to be unique. A
 * config with two rules sharing an id therefore gets one merged row rather than
 * two — a consequence of a config fault that is not validated yet, and a fairly
 * loud tell when it is hit.
 */
export function tally(rules: readonly FrontmatterRule[], resolutions: readonly Resolution[]): readonly RuleCoverage[] {
  const counts = new Map(rules.map((rule) => [rule.ruleId, blank()]));
  for (const resolution of resolutions) record(counts, resolution);
  return rules.map((rule) => row(rule, rules, counts.get(rule.ruleId)));
}

function record(counts: Map<string, Counts>, resolution: Resolution): void {
  for (const { rule, outcome } of resolution.outcomes) {
    // `unmatched` is the overwhelming majority and carries no information: a
    // rule that never selected a path was never in the running for it.
    if (outcome === 'unmatched') continue;
    const count = counts.get(rule.ruleId);
    if (count === undefined) continue;
    count[outcome] += 1;
    if (outcome === 'shadowed' && resolution.winner !== null) count.shadowedBy.add(resolution.winner.ruleId);
  }
}

function row(rule: FrontmatterRule, rules: readonly FrontmatterRule[], counted: Counts | undefined): RuleCoverage {
  const { won, shadowed, excluded, shadowedBy } = counted ?? blank();
  return {
    rule: ruleRef(rule),
    won,
    shadowed,
    // Filtered out of the rule list rather than read off the Set, so the order
    // is CONFIG order by construction: a shadower always sits above, so this
    // reads as "look at these, in this order". Set insertion order would have
    // been corpus order, which is somebody's directory listing.
    shadowedBy: rules.filter((other) => shadowedBy.has(other.ruleId)).map((other) => other.ruleId),
    excluded,
  };
}
