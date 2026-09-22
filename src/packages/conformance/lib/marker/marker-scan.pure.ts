// How a Conformance case states its own outcome, read out of its text.
//
// Deliberately separate from the read. A Conformance case's bytes are the
// contract, so a test of this grammar must run against a body it wrote itself:
// exercising it against a committed case would make every marker edit look like
// a way to turn a test green, which is the drift ARCH-002 exists to stop.
//
// Two markers, two cardinalities — `expect:` exactly once, `assess:` at most
// once — so this file answers with a LIST and leaves the counting to the caller
// that knows which cardinality it wants.

const EXPECT_RE = /<!--\s*expect:\s*(\S+?)\s*-->/g;
const ASSESS_RE = /<!--\s*assess:\s*(\S+?)\s*-->/g;

/**
 * Every `<!-- expect: VERDICT -->` marker in `body`, in source order.
 *
 * The regex is the one ARCH-002's `expect-marker` rule names, so the runner and
 * the enforcer read the same case the same way. `\s*` on both sides rather than
 * a single literal space: an author who writes `<!--expect: PASSES-->` has
 * stated a verdict, and a runner that silently could not see it would report a
 * missing marker for a case that carries one.
 */
export function expectMarkersIn(body: string): readonly string[] {
  return [...body.matchAll(EXPECT_RE)].map((match) => match[1]);
}

/** Every `<!-- assess: ACTION -->` marker in `body`, in source order. */
export function assessMarkersIn(body: string): readonly string[] {
  return [...body.matchAll(ASSESS_RE)].map((match) => match[1]);
}
