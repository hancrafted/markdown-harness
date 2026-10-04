/**
 * How every Rule fared across one corpus.
 *
 * The bookkeeping first-match makes necessary. Resolution answers with the
 * WINNER for a file and discards the rest, which is why a losing Rule is
 * silent; this walks the whole list for every file so the Rules that lost, and
 * the Rules that reached nothing, still have a row.
 *
 * Selection is not decided here. The caller hands in the verdict function, so
 * the tally explains exactly the first-match `--query` and `--check` run on
 * and a Module's extra axis (`types`) counts without this file naming it.
 */

import type { RuleAudit } from '../../../response-contract/index.ts';
import type { RuleHead, Selection, TallyReading } from './rule-selection.types.ts';

/**
 * One Rule's running counts. `shadowedBy` accumulates Rule POSITIONS rather
 * than ids: the report owes config order, and a set of ids would only
 * remember the order files happened to arrive in.
 */
interface Tally {
  won: number;
  shadowed: number;
  excluded: number;
  shadowedBy: Set<number>;
}

/** What one file did to the Rule list, by position. `winner` is `-1` when no Rule selected it. */
interface Attribution {
  winner: number;
  shadowed: readonly number[];
  excluded: readonly number[];
}

/** How every Rule stands towards one file, read in config order. */
function attributionFor<R, F>(file: F, rules: readonly R[], selection: (rule: R, file: F) => Selection): Attribution {
  const verdicts = rules.map((rule) => selection(rule, file));
  const selected = verdicts.flatMap((verdict, position) => (verdict === 'selected' ? [position] : []));
  return {
    winner: selected.length > 0 ? selected[0] : -1,
    shadowed: selected.slice(1),
    excluded: verdicts.flatMap((verdict, position) => (verdict === 'excluded' ? [position] : [])),
  };
}

/** Fold every file's attribution into one running tally per Rule. */
function countAll<R, F>(
  files: readonly F[],
  rules: readonly R[],
  selection: TallyReading<R, F>['selection'],
): readonly Tally[] {
  const tallies: readonly Tally[] = rules.map(() => ({
    won: 0,
    shadowed: 0,
    excluded: 0,
    shadowedBy: new Set<number>(),
  }));
  for (const file of files) {
    const attribution = attributionFor(file, rules, selection);
    if (attribution.winner !== -1) tallies[attribution.winner].won += 1;
    for (const position of attribution.shadowed) {
      tallies[position].shadowed += 1;
      tallies[position].shadowedBy.add(attribution.winner);
    }
    for (const position of attribution.excluded) tallies[position].excluded += 1;
  }
  return tallies;
}

/**
 * One row per Rule, in config order, a Rule that won nothing included — that
 * is the row an Operator most needs to see. A Rule's own `excludeFiles` takes
 * no part in the contest: an excluded file is neither won nor shadowed there.
 *
 * @param files The corpus, in walker order, in whatever shape the reading's selection function takes.
 * @param rules The Rules, in the order the Operator wrote them.
 * @param reading How a Module's Rule stands towards a file, and how it reports its selector.
 */
export function tallyRules<R extends RuleHead, F>(
  files: readonly F[],
  rules: readonly R[],
  reading: TallyReading<R, F>,
): readonly RuleAudit[] {
  const tallies = countAll(files, rules, reading.selection);
  return rules.map((rule, position) => ({
    rule: { ruleId: rule.ruleId, selector: reading.refOf(rule), intent: rule.intent },
    won: tallies[position].won,
    shadowed: tallies[position].shadowed,
    shadowedBy: [...tallies[position].shadowedBy]
      .sort((left, right) => left - right)
      .map((index) => rules[index].ruleId),
    excluded: tallies[position].excluded,
  }));
}
