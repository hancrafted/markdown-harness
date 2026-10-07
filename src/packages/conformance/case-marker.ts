// What one Conformance case states about itself, read from its own bytes.
//
// The vocabulary is ARCH-002's and is spelled here once, so a runner comparing
// a stated outcome against a reported one compares two values named in the same
// place. Reduced to the same three words the markers use, because a
// disagreement then reads `expected 'PASSES' to be 'FAILS'` — it names what the
// harness actually said, where a boolean would report the same sentence for
// every possible cause.

import { readCaseText } from './lib/case/case-text.impure.ts';
import { assessMarkersIn, expectMarkersIn } from './lib/marker/marker-scan.pure.ts';

/** The three verdicts an `expect:` marker may name (ARCH-002 §2.1). */
export const PASSES = 'PASSES';
export const FAILS = 'FAILS';
export const UNGOVERNED = 'UNGOVERNED';

/** The three agent actions an `assess:` marker may name (ARCH-002 §4.1). */
export const REVIEW = 'REVIEW';
export const PROCEED = 'PROCEED';
export const FIX_FILE = 'FIX_FILE';

/**
 * The verdict one case states.
 *
 * Throws rather than defaulting: a case with no marker, or with two, is a
 * broken contract and not a file to quietly skip. ARCH-002's `expect-marker`
 * rule already rejects both, so reaching either here means the rule did not
 * run — which is the reach the rule's own empty-glob guard exists to report.
 */
export function verdictOf(tierRoot: string, casePath: string): string {
  const found = expectMarkersIn(readCaseText(tierRoot, casePath));
  if (found.length !== 1) throw new Error(`${casePath} must carry exactly one expect marker, found ${found.length}`);
  return found[0];
}

/**
 * The agent action one case states, or `undefined` where it states none.
 *
 * Absence is legal and is not a legal `expect:`: the Assessment markers cover
 * the five states deliberately rather than exhaustively, because a freshness
 * answer is meaningless for most of this corpus. Two markers are a broken
 * contract on the same terms as two `expect:` markers, so it throws.
 */
export function agentActionOf(tierRoot: string, casePath: string): string | undefined {
  const found = assessMarkersIn(readCaseText(tierRoot, casePath));
  if (found.length > 1) throw new Error(`${casePath} must carry at most one assess marker, found ${found.length}`);
  return found[0];
}
