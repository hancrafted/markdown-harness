/**
 * Which rule governs a path — first match wins, nothing merges, nothing
 * inherited (tenet 5).
 */

import type { FrontmatterRule, Glob } from '../../../contract/config.ts';
import type { RepoPath } from '../../../contract/corpus.ts';
import type { RuleRef, SilentRule } from '../../../contract/values.ts';
import { matches } from '../../glob.ts';

/**
 * How one rule fared against ONE path.
 *
 * Named rather than boolean because all four are needed, and they are the four
 * different answers to "why isn't my rule applying?": it selected nothing,
 * something above it took the file, its own `excludeFiles` removed the file
 * first, or it governs.
 */
export type Outcome = 'won' | 'shadowed' | 'excluded' | 'unmatched';

/**
 * One rule, and how it fared on one path.
 *
 * The rule TRAVELS WITH its outcome rather than being recovered by position
 * from the rule list. A parallel array would have reintroduced positional rule
 * identity through the back door — implicitly, and in every consumer — one
 * commit after `Winner.index` was removed for being exactly that.
 */
export interface RuleOutcome {
  rule: FrontmatterRule;
  outcome: Outcome;
}

/**
 * One path against the whole rule list.
 *
 * `winner` alone would be cheaper — the walk could stop at the first match —
 * but then every losing rule stays silent, which is the stated cost of tenet 5
 * and the thing `coverage` exists to pay off. Resolving and tallying from ONE
 * pass is also what stops the report and its coverage from disagreeing.
 */
export interface Resolution {
  /** The governing rule, or `null` — and `null` means invisible, not unconstrained. */
  winner: FrontmatterRule | null;
  /** One entry per rule, in config order. */
  outcomes: readonly RuleOutcome[];
}

/**
 * A rule's selectors, as globs.
 *
 * `fileName: "log.md"` desugars to `path: ["**\/log.md"]`, so everything is a
 * path glob underneath and precedence stays one-dimensional.
 */
export function selectors(rule: FrontmatterRule): readonly Glob[] {
  return rule.fileName === undefined ? (rule.path ?? []) : [`**/${rule.fileName}`];
}

/**
 * The rule as the report refers to it: by `ruleId`, never by position.
 *
 * The selector travels as the Operator WROTE it, sugar unexpanded — a rule keyed
 * on `fileName: index.md` reads back as that, not as `**\/index.md`. `intent` is
 * the rule's own reason and the only copy of it in the report; a field
 * constraint that overrides it does so inside its own fragment.
 */
export function ruleRef(rule: FrontmatterRule): RuleRef {
  return {
    ruleId: rule.ruleId,
    selector: rule.fileName === undefined ? { path: rule.path ?? [] } : { fileName: rule.fileName },
    intent: rule.intent,
  };
}

/**
 * The rule as a report names a rule that says nothing — `ruleId` and where it
 * looks, and deliberately not why it exists. `SilentRule` carries the argument.
 */
export function silentRule(rule: FrontmatterRule): SilentRule {
  const { ruleId, selector } = ruleRef(rule);
  return { ruleId, selector };
}

/**
 * Exclusion wins within a rule and takes no part in ordering: it answers one
 * yes/no question BEFORE that rule can win, which is what lets an excluded file
 * fall through to a later, broader rule.
 *
 * `decided` is whether a rule above this one has already won. It is the only
 * thing that separates `won` from `shadowed`, and it is why the outcome of one
 * rule cannot be computed without the ones above it.
 */
function fared(rule: FrontmatterRule, path: RepoPath, decided: boolean): Outcome {
  if (!selectors(rule).some((glob) => matches(path, glob))) return 'unmatched';
  if (exclusions(rule, path).length > 0) return 'excluded';
  return decided ? 'shadowed' : 'won';
}

/**
 * The globs from this rule's own `excludeFiles` that match, verbatim.
 *
 * EVERY match, not the first: a steering answer reports these so the Operator
 * knows which line to delete, and deleting one of two changes nothing. Shared
 * with `outcome` above so there is one definition of which exclusions fired —
 * it costs the short-circuit and buys a report that cannot disagree with the
 * resolution it describes.
 */
export function exclusions(rule: FrontmatterRule, path: RepoPath): readonly Glob[] {
  return (rule.excludeFiles ?? []).filter((glob) => matches(path, glob));
}

/** Every rule against one path, top-down. First match wins; the rest are recorded, not discarded. */
export function resolve(rules: readonly FrontmatterRule[], path: RepoPath): Resolution {
  const outcomes: RuleOutcome[] = [];
  let winner: FrontmatterRule | null = null;

  for (const rule of rules) {
    const outcome = fared(rule, path, winner !== null);
    if (outcome === 'won') winner = rule;
    outcomes.push({ rule, outcome });
  }

  return { winner, outcomes };
}
