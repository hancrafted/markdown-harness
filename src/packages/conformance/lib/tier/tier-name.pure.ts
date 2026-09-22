// The one convention that ties a tier to the runner checking it: a tier
// directory named `<tier>` is checked by `<tier>-tier.test.ts`.
//
// Named once, and here, because the enrolment check compares two sets derived
// through it. Spelling the suffix on both sides is how the two would drift, and
// a drift in this particular pair reads as "the tier has no runner" — which is
// the failure the check exists to produce, so it must never be produced by
// accident.

const RUNNER_SUFFIX = '-tier.test.ts';

/** The runner file name a tier directory must be matched by. */
export function runnerFileFor(tier: string): string {
  return `${tier}${RUNNER_SUFFIX}`;
}

/**
 * The tier a runner file name claims, or `undefined` for a file that claims
 * none.
 *
 * The enrolment check's own file sits beside the runners, and so will anything
 * else the Package tests. Answering `undefined` for them is what stops a
 * neighbour reading as a tier with no directory — a failure in the direction
 * that proves nothing.
 */
export function tierOfRunnerFile(fileName: string): string | undefined {
  if (!fileName.endsWith(RUNNER_SUFFIX)) return undefined;
  const tier = fileName.slice(0, -RUNNER_SUFFIX.length);
  return tier.length > 0 ? tier : undefined;
}
