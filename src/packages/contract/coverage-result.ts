/**
 * `--coverage`: how every rule fared across the corpus.
 *
 * ITS OWN COMMAND, and that split is the point of this file existing.
 *
 * The stated cost of first match (tenet 5) is that EVERY LOSING RULE IS SILENT.
 * A rule that wins no file reports nothing, so an ordering mistake or a typo in
 * a glob is invisible forever — and invisible in exactly the direction a trust
 * tool cannot afford, since the missing output looks identical to a clean one.
 * This is the single diagnostic that design most needs, and the only one that
 * costs a full files x rules match matrix rather than falling out of the walk.
 * It has already earned it: `research-notes won=4 shadowed=4
 * shadowedBy=['research-parts']` is the row that exposed an over-demanding rule
 * in this repo's own config and took one dogfood run from 70 violations to 54.
 *
 * So why it moved out of the check report rather than being deleted. It is the
 * OPERATOR's instrument, and `--check` is read by a Contributor's agent that can
 * act on none of it — measured at 8 to 12 percent of a dogfood check payload,
 * which is a real cost for a reader that will never use it. That is the same
 * argument, one level further out, that removed the shadowed and excluded rules
 * from the steering answer. One payload, one question.
 */

import type { RuleRef } from './values.ts';

export interface CoverageResult {
  /** One row per rule, in config order — including the rules that governed nothing. */
  rules: readonly RuleCoverage[];
}

/**
 * How one rule fared.
 *
 * Keyed by `ruleId`, which is what makes it useful: before rules were named,
 * "your rule was shadowed" could only point at a position that moves.
 *
 * `selector` is here and nowhere else in the responses. This is the payload for
 * somebody debugging why a glob did or did not match, and it is the only reader
 * that has any use for the glob itself.
 */
export interface RuleCoverage {
  rule: RuleRef;
  /** Files this rule governs: it selected them, and no rule above it had already. */
  won: number;
  /** Files it selected that a rule ABOVE it had already taken. */
  shadowed: number;
  /**
   * The rules that took them, by `ruleId`, deduped, in config order.
   *
   * Always present, `[]` when nothing shadowed: an optional field would give
   * one fact two shapes and every consumer would handle both forever.
   *
   * This is the field that could not exist before rules were named. "Something
   * above you won" is not actionable; "`index-files` won" is, and it stays true
   * next week when a rule is inserted above both of them.
   */
  shadowedBy: readonly string[];
  /** Files it selected that its OWN `excludeFiles` removed before it could win. */
  excluded: number;
}
