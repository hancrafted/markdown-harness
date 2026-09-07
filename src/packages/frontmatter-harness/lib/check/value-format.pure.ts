/**
 * The three named format grammars, in full.
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

import type { Format } from '../../../config-contract/index.ts';

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
 * Whether a string satisfies one named format.
 *
 * Takes the value as a STRING: every format names strings, so meeting any other
 * shape is a shape collision the caller reports instead, and never a mismatch
 * of form.
 *
 * @param format The named format the constraint asked for.
 * @param value The value found in the frontmatter.
 */
export function matchesFormat(format: Format, value: string): boolean {
  if (format === 'datetime') return DATETIME.test(value);
  if (format === 'uri') return URI.test(value);
  return ACTOR_COLON.test(value) || ACTOR_SLASH.test(value);
}
