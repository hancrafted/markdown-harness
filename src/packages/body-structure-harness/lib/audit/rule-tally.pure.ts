/**
 * How every Rule fared across one corpus, counted over all three axes
 * (design-ADR 0015).
 *
 * The first Module tallies from paths alone. This one cannot: whether a Rule
 * that writes `types` selected a file depends on the file's `type`, so a
 * shadowed or excluded count would be wrong without it. The caller opens the
 * files `candidatePaths` names and hands each `type` in.
 *
 * Rows in config order, a Rule that won nothing included — that is the row an
 * Operator needs to see.
 */

import type { RuleAudit, SelectorRef } from '../../../response-contract/index.ts';
import type { BodyStructureRule } from '../../section.ts';
import { axesMatch, reaches, selectionFor } from '../rules/selection.pure.ts';

/** One corpus file and the `type` read out of it, `undefined` when there is none to read. */
interface TypedFile {
  path: string;
  type: string | undefined;
}

interface Tally {
  won: number;
  shadowed: number;
  excluded: number;
  shadowedBy: Set<number>;
}

/**
 * The audit's candidates: every file it opens, and so every file whose failure
 * to open refuses it (design-ADR 0015).
 *
 * Two kinds, in walker order. Every path some Rule reaches, which is exactly
 * the set `--check` opens, so the two commands refuse over the same unreadable
 * file. And every path a Rule writing `types` matches on its path axes even
 * where its own exclusion removes it, because an `excluded` count needs all
 * three axes to match and so needs that file's `type`. A path neither kind
 * names tallies the same whatever its bytes, and is never opened.
 *
 * @param paths The corpus, normalised, in walker order.
 * @param rules The section's Rules, in config order.
 */
export function candidatePaths(paths: readonly string[], rules: readonly BodyStructureRule[]): readonly string[] {
  return paths.filter((path) =>
    rules.some((rule) => reaches(rule, path) || (rule.types !== undefined && axesMatch(rule, path))),
  );
}

/** A Rule's selector as written: an axis it never wrote is left out entirely. */
function selectorRefFor(rule: BodyStructureRule): SelectorRef {
  return {
    ...(rule.folders === undefined ? {} : { folders: rule.folders }),
    ...(rule.fileNames === undefined ? {} : { fileNames: rule.fileNames }),
    ...(rule.types === undefined ? {} : { types: rule.types }),
  };
}

/** Which Rule won one file, which later Rules it shadowed, and which Rules excluded it, by position. */
interface Attribution {
  winner: number;
  shadowed: readonly number[];
  excluded: readonly number[];
}

/** How every Rule stands towards one file, read in config order. */
function attributionFor(file: TypedFile, rules: readonly BodyStructureRule[]): Attribution {
  const selections = rules.map((rule) => selectionFor(rule, file.path, file.type));
  const selected = selections.flatMap((selection, position) => (selection === 'selected' ? [position] : []));
  return {
    winner: selected.length > 0 ? selected[0] : -1,
    shadowed: selected.slice(1),
    excluded: selections.flatMap((selection, position) => (selection === 'excluded' ? [position] : [])),
  };
}

/**
 * Tally the section's Rules across a corpus.
 *
 * @param files Every corpus file with its `type`, in walker order.
 * @param rules The section's Rules, in config order.
 */
export function tallyRules(files: readonly TypedFile[], rules: readonly BodyStructureRule[]): readonly RuleAudit[] {
  const tallies: readonly Tally[] = rules.map(() => ({
    won: 0,
    shadowed: 0,
    excluded: 0,
    shadowedBy: new Set<number>(),
  }));

  for (const file of files) {
    const attribution = attributionFor(file, rules);
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
    shadowedBy: [...tallies[position].shadowedBy]
      .sort((left, right) => left - right)
      .map((index) => rules[index].ruleId),
    excluded: tallies[position].excluded,
  }));
}
