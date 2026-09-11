/**
 * The four named format grammars, in full.
 *
 * "Form only" is not a grammar, and the spec says four independent readings of
 * that phrase produced four different validators — so each grammar is written
 * out here as one expression, with the reading it encodes stated beside it.
 *
 * NOTHING HERE CONSULTS A CLOCK, and nothing reaches for `Date`. A validator
 * that parsed a date would be checking whether the day exists, which is a
 * different claim from whether the value is well-formed, and the spec settles
 * it in the opposite direction: `2026-02-30T00:00:00Z` passes.
 */

import type { Format } from '../../config-contract/index.ts';

/**
 * A date, `T`, a time to full seconds, an optional fractional part, then an
 * EXPLICIT offset of `Z` or `±hh:mm`.
 *
 * Lowercase `t` and `z` are accepted, the leniency RFC 3339 grants. The digit
 * counts are the entire check: month 13 and day 45 are well-formed here, and
 * `2026-13-45` fails only because it carries no time and no offset.
 */
const DATETIME = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/;

/**
 * One non-empty token with no whitespace in it.
 *
 * "A path or URI" is the whole of it: no scheme list, no host rules, no
 * percent-encoding check. Widening this would start rejecting the repo-relative
 * paths that are the common case.
 */
const URI = /^\S+$/;

/** `human:<id>` or `process:<id>`, the two reserved producers' own form. */
const ACTOR_COLON = /^(?:human|process):\S+$/;

/**
 * `<producer>/<version>`, with exactly one slash and neither half empty.
 *
 * `human` and `process` are excluded because they belong to the colon form:
 * the slash form is for tools, so `human/hancrafted` is a mismatch however
 * reasonable it looks. That rule was previously discoverable only by reading a
 * fixture, which is not where a rule belongs.
 */
const ACTOR_SLASH = /^(?!human\/|process\/)[^\s/]+\/[^\s/]+$/;

/**
 * Lowercase alphanumeric words joined by SINGLE hyphens.
 *
 * PROMOTED, not invented: this is the regex `valid-test-config.yaml` already
 * carried as a bare `pattern` on `slug`. Every edge is stated, because this is
 * portable specification rather than a local convenience:
 *
 *   - a leading, trailing or DOUBLED hyphen is rejected — `-a`, `a-`, `a--b`
 *   - digits are accepted, INCLUDING in first position — `0006-slug` passes,
 *     which it must, since this repo's own design-ADR filenames open with one
 *   - a digits-only word passes, and so does a single character
 *   - the EMPTY STRING fails here and is not this constraint's business:
 *     an absent or blank value is owned by `presence`, which is why a blank
 *     optional field never reaches this function at all
 */
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * One grammar per named format, keyed by the format's own spelling.
 *
 * A `Record<Format, …>` rather than an `if` chain, and the difference is
 * measured rather than stylistic. The chain this replaced ended
 * `return ACTOR_COLON.test(value) || ACTOR_SLASH.test(value)` — an unguarded
 * fallthrough that treated ANYTHING not `datetime` and not `uri` as `actor`.
 * A fourth member of the union was therefore silently unchecked the moment it
 * was declared: `format: kebab-case` would have been judged against the actor
 * grammar and reported a mismatch nobody could explain.
 *
 * This shape cannot do that. A new member of `Format` stops this object
 * compiling until its grammar is written, which is the whole reason the table
 * is keyed rather than branched.
 */
const GRAMMARS: Record<Format, (value: string) => boolean> = {
  datetime: (value) => DATETIME.test(value),
  uri: (value) => URI.test(value),
  actor: (value) => ACTOR_COLON.test(value) || ACTOR_SLASH.test(value),
  'kebab-case': (value) => KEBAB_CASE.test(value),
};

/**
 * Whether a string satisfies one named format.
 *
 * Takes the value as a STRING: every format names strings, so meeting any other
 * shape is a shape collision the caller reports instead, and never a mismatch
 * of form.
 *
 * @param format The named format the constraint asked for.
 * @param value The value found in the document or in the name.
 */
export function matchesFormat(format: Format, value: string): boolean {
  return GRAMMARS[format](value);
}
