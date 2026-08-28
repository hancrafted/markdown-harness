/**
 * The three named formats, as a table of predicates.
 *
 * Not sugar. `actor` is the clearest case for a name over a regex — a three-way
 * alternation that is unreadable written out and self-evident written as
 * `format: actor`. The others earn their names the same way: the point of a
 * named format is that the violation can say the NAME rather than the pattern,
 * which is the same reason a `pattern` violation carries no operand.
 *
 * Every check here checks FORM and only form. `datetime` never asks whether a
 * date is in the past: the check path is hermetic (tenet 3) and there is no
 * clock behind this seam — ESLint bans `Date.now()` and `new Date()` from
 * `src/packages/**` to keep it that way. Staleness is a Signal a document
 * publishes for a reader who may never run `markdown-harness`; detecting it is
 * same act as checking that `stale_after` is well formed, and only the second
 * happens here.
 *
 * Values arrive as strings because YAML 1.2's core schema has no timestamp type
 * — measured: `at: 2026-08-25T09:00:00Z` parses to a string, not a Date. A YAML
 * 1.1 library would hand over a Date instead, which is a fact a port needs and
 * one more reason the corpus is the specification rather than the source.
 */

import type { Format } from '../../contract/constraints.ts';

/**
 * ISO 8601 with an EXPLICIT UTC offset — `Z` or a signed `HH:MM`.
 *
 * The offset is required rather than optional. A timestamp without one is
 * ambiguous by exactly the amount that matters when two documents are compared,
 * and comparison is the whole purpose of recording a time.
 */
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * A path or a URI — deliberately the weakest of the three.
 *
 * It asserts one thing: the value is a single non-empty token with no
 * whitespace. Anything stronger would have to choose between a repo-relative
 * path and an absolute URI, and OKF's own `sources[].resource` examples are one
 * of each: `docs/okf/SPEC-v0.2.md` and `https://www.rfc-editor.org/rfc/rfc8820`.
 *
 * Whether a check this weak earns a place in the vocabulary is a real question
 * for goal 1, and it is left standing rather than answered here. The dogfood
 * configs are where its value gets measured.
 */
const URI = /^\S+$/;

/** `<producer>/<version>` — exactly one slash, no colon, no whitespace. */
const PRODUCER = /^[^\s/:]+\/[^\s/:]+$/;

/** `human:<id>` | `process:<id>`. Consumers derive trust from the `human:` prefix. */
const PREFIXED = /^(human|process):\S+$/;

/**
 * `human` and `process` are RESERVED as producer names, and this reservation is
 * load-bearing rather than tidy.
 *
 * Read as a naive three-way alternation, `human/hancrafted` — a slash where a
 * colon belongs — satisfies the producer arm as producer `human`, version
 * `hancrafted`. It would PASS. And `fixtures/docs/research/bad-actor.md`, whose
 * entire stated purpose is to be a malformed Actor that a non-winning rule would
 * have caught, would stop proving anything at all.
 *
 * The reservation is also the right answer on its own terms: an Actor's whole
 * job is letting a consumer tell a human from a machine, so a producer that can
 * spell itself `human` defeats the field.
 */
const RESERVED_PRODUCERS: readonly string[] = ['human', 'process'];

function isActor(value: string): boolean {
  if (PREFIXED.test(value)) return true;
  if (!PRODUCER.test(value)) return false;
  return !RESERVED_PRODUCERS.includes(value.slice(0, value.indexOf('/')));
}

const FORMATS: Record<Format, (value: string) => boolean> = {
  datetime: (value) => DATETIME.test(value),
  uri: (value) => URI.test(value),
  actor: isActor,
};

export function conformsTo(format: Format, value: string): boolean {
  return FORMATS[format](value);
}
