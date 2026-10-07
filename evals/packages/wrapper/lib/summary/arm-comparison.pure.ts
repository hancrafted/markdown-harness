import type { Counts } from './arm-comparison.types.ts';

// The arm comparison: an exact one-sided Fisher test, steered against
// intent-neutralised, at the five percent level. The rule is stated and labelled
// provisional: no variance has ever been measured, so the threshold is a stated
// convention and not a finding.

export const SIGNIFICANCE = 0.05;

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let step = 1; step <= k; step += 1) result = (result * (n - k + step)) / step;
  return result;
}

/** P(at least `steeredHits` of the pooled hits fall in the steered arm), hypergeometric, one-sided. */
export function fisherOneSided(counts: Counts): number {
  const { steeredHits, steeredN, neutralisedHits, neutralisedN } = counts;
  const hits = steeredHits + neutralisedHits;
  const total = steeredN + neutralisedN;
  let probability = 0;
  for (let k = steeredHits; k <= Math.min(hits, steeredN); k += 1) {
    probability += (choose(steeredN, k) * choose(neutralisedN, hits - k)) / choose(total, hits);
  }
  return Math.min(1, probability);
}
