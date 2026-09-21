// The fault catalog the rejected-config tier claims to cover, written by hand.
//
// HAND-WRITTEN DELIBERATELY, for the reason the frontmatter runner already
// states about its case count: a list derived from the thing it is checking
// cannot fail. Generating this from `ConfigFaultCode` would make coverage and
// closure agree with the contract by construction, and a retired code would
// leave the tier silently one case heavier than the catalog it specifies.
//
// The cost of writing it by hand is drift, and the pin below is what pays it.

import type { ConfigFaultCode } from '../response-contract/index.ts';

/**
 * Every code the tier undertakes to reach, in the order §3.5's catalog declares
 * them: the three that name the config FILE first, then the eleven that name a
 * key inside it.
 *
 * `satisfies` holds one direction — a code spelled wrong, or one the catalog
 * never had, does not compile. `unreachedProof` holds the other.
 *
 * Fourteen, down from fifteen. `CONFIG_SELECTOR_AMBIGUOUS` was retired with the
 * grammar that made it reachable: `folders:` and `fileNames:` intersect rather
 * than exclude, so a rule carrying both is spelling an exact path rather than
 * asking two questions at once. Its case directory was deleted in the same
 * change — halves that land apart leave the suite red, which is the machinery
 * working rather than a hole to paper over.
 */
export const DECLARED_CODES = [
  'CONFIG_NOT_FOUND',
  'CONFIG_UNREADABLE',
  'CONFIG_NOT_YAML',
  'CONFIG_UNRECOGNISED_KEY',
  'CONFIG_INVALID_VALUE',
  'CONFIG_EMPTY_RULE_LIST',
  'CONFIG_DUPLICATE_RULE_ID',
  'CONFIG_SELECTOR_MISSING',
  'CONFIG_MISSING_RULE_INTENT',
  'CONFIG_MISSING_PATTERN_INTENT',
  'CONFIG_EMPTY_INTENT',
  'CONFIG_EMPTY_CONSTRAINT',
  'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD',
  'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD',
] as const satisfies readonly ConfigFaultCode[];

/** Whatever the catalog declares and the list above has not claimed. */
type UnreachedCodes = Exclude<ConfigFaultCode, (typeof DECLARED_CODES)[number]>;

/**
 * The pin, HELD BY THE TYPE CHECKER AND NEVER BY THE TEST RUNNER.
 *
 * `UnreachedCodes` collapses to `never` only while the hand-written list covers
 * the union whole. The moment it does not, the annotation evaluates to `false`,
 * `true` is not assignable to it, and `tsc --noEmit` refuses the file naming
 * this line — which is the only place a code added to the catalog and forgotten
 * here can be caught, because vitest transforms types away without reading them.
 *
 * The obvious shape does NOT work and was rejected on measurement: an empty
 * array literal is assignable to any array type, so a pin written as
 * `const unreached: UnreachedCodes[] = []` compiles cleanly over a missing
 * member and enforces nothing at all. The tuple wrapper on both sides of
 * `extends` is load-bearing too — it stops the conditional distributing over the
 * union, which would make a partially covered catalog answer `true`.
 */
export const unreachedProof: [UnreachedCodes] extends [never] ? true : false = true;
