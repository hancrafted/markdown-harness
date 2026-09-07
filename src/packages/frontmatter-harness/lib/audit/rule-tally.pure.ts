/**
 * How every rule fared across one corpus.
 *
 * The bookkeeping first-match makes necessary. Resolution answers with the
 * WINNER for a path and discards the rest, which is the whole reason a losing
 * rule is silent; this walks the full list for every file instead, so that the
 * rules which lost — and the rules which reached nothing at all — still have
 * something to report.
 *
 * Selection itself is not decided here. It comes from `selectionFor`, the same
 * function `--query` and `--check` resolve with, so a diagnostic meant to
 * explain first-match cannot end up explaining a second opinion.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { RuleAudit } from '../../../response-contract/index.ts';
import type { GlobMatcher } from '../rules/rules.types.ts';
import { selectionFor } from '../rules/selector.pure.ts';
import { selectorRefFor } from './selector-ref.pure.ts';

/**
 * One rule's running counts.
 *
 * A private local type beside its only consumer. `shadowedBy` accumulates rule
 * POSITIONS rather than ids: the report owes config order, and a set of ids
 * would only remember the order files happened to arrive in.
 */
interface Tally {
  won: number;
  shadowed: number;
  excluded: number;
  shadowedBy: Set<number>;
}

/**
 * What one file did to the rule list.
 *
 * Returned rather than applied, so that the only thing this file ever mutates
 * is a collection its own exported function created. `winner` is `-1` when no
 * rule selected the file at all — the file is invisible, and every rule that
 * merely reached it was either excluded or nothing.
 */
interface Attribution {
  winner: number;
  shadowed: readonly number[];
  excluded: readonly number[];
}

/** A fresh tally per rule, so a rule that is never reached still has a row. */
function emptyTallies(count: number): readonly Tally[] {
  return Array.from({ length: count }, () => ({ won: 0, shadowed: 0, excluded: 0, shadowedBy: new Set<number>() }));
}

/**
 * Walk the whole rule list for one file.
 *
 * The first rule that selects it wins; every later rule that also selected it
 * is shadowed. A rule whose own `excludeFiles` took the file back is recorded
 * apart and takes no part in the contest, which is what keeps exclusion out of
 * ordering entirely.
 */
function attributionFor(file: string, rules: readonly FrontmatterRule[], matches: GlobMatcher): Attribution {
  const shadowed: number[] = [];
  const excluded: number[] = [];
  let winner = -1;

  rules.forEach((rule, position) => {
    const selection = selectionFor(rule, file, matches);

    if (selection === 'excluded') {
      excluded.push(position);
      return;
    }

    if (selection === 'unselected') return;

    if (winner === -1) {
      winner = position;
      return;
    }

    shadowed.push(position);
  });

  return { winner, shadowed, excluded };
}

/** The winners' ids, deduped by the set and ordered by config position. */
function shadowedByIds(shadowedBy: Set<number>, rules: readonly FrontmatterRule[]): readonly string[] {
  return [...shadowedBy].sort((left, right) => left - right).map((position) => rules[position].ruleId);
}

/**
 * One row per rule, in config order, including rules that governed nothing.
 *
 * @param files The corpus, as root-relative paths.
 * @param rules The ordered rule list, in the order the Operator wrote it.
 * @param matches The glob matcher to decide with.
 */
export function tallyRules(
  files: readonly string[],
  rules: readonly FrontmatterRule[],
  matches: GlobMatcher,
): readonly RuleAudit[] {
  const tallies = emptyTallies(rules.length);

  for (const file of files) {
    const attribution = attributionFor(file, rules, matches);

    if (attribution.winner !== -1) tallies[attribution.winner].won += 1;

    for (const position of attribution.shadowed) {
      tallies[position].shadowed += 1;
      tallies[position].shadowedBy.add(attribution.winner);
    }

    for (const position of attribution.excluded) tallies[position].excluded += 1;
  }

  return rules.map((rule, position) => ({
    rule: { ruleId: rule.ruleId, selector: selectorRefFor(rule), intent: rule.intent },
    won: tallies[position].won,
    shadowed: tallies[position].shadowed,
    shadowedBy: shadowedByIds(tallies[position].shadowedBy, rules),
    excluded: tallies[position].excluded,
  }));
}
