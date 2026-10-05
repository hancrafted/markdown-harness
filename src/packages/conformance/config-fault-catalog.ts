// The fault catalog the rejected-config tier claims to cover, written by hand.
//
// HAND-WRITTEN DELIBERATELY, for the reason the frontmatter runner already
// states about its case count: a list derived from the thing it is checking
// cannot fail. Generating this from `DeclaredFaultCode` would make coverage and
// closure agree with the contract by construction, and a retired code would
// leave the tier silently one case heavier than the catalog it specifies.
//
// The cost of writing it by hand is drift, and the pin below is what pays it.

// The contract is the WHOLE catalog: the Core's codes and every declared
// Module's own. `config-contract` holds only the Core's, so the union is the one
// `cli` derives from the declared Module set.
import type { DeclaredFaultCode } from '../cli/declared-module.ts';

/**
 * Every code the tier undertakes to reach, in the order §3.5's catalog declares
 * them: the four that name the config FILE first, then the twenty-one that name a
 * key inside it.
 *
 * The `satisfies` check holds one direction — a code spelled wrong, or one the
 * catalog never had, does not compile. Its intersection holds the other.
 *
 * Twenty-five today. The count is not history to keep here — `git log` holds
 * that — but the rule for changing it is: a code is retired together with its
 * case directory, and a code arrives together with its case, in the same
 * change. Halves that land apart leave the suite red in one direction or the
 * other, which is the machinery working rather than a hole to paper over: a
 * code with no case fails coverage, and a case with no code fails closure.
 */
const declaredCodes = [
  'CONFIG_NOT_FOUND',
  'CONFIG_UNREADABLE',
  'CONFIG_NOT_YAML',
  'CONFIG_NO_MODULE_SECTION',
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
  'CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE',
  'CONFIG_ENUMERATION_WITHOUT_COUNT',
  'CONFIG_ENUMERATION_PINS_TEXT',
  'CONFIG_COUNT_BOUNDS_INVERTED',
  'CONFIG_ENTRY_BEYOND_MAX_LEVEL',
  'CONFIG_MAX_LEVEL_ON_CLOSED_SPINE',
  'CONFIG_DUPLICATE_VOCABULARY_TITLE',
  'CONFIG_DUPLICATE_BLOCK_KIND',
  'CONFIG_NESTED_ENTRY_NOT_DEEPER',
  'CONFIG_PATTERN_WITH_ALLOWED',
] as const;

/** Whatever the catalog declares and the list above has not claimed. */
type UnreachedCodes = Exclude<DeclaredFaultCode, (typeof declaredCodes)[number]>;

/**
 * The two-sided catalog proof, HELD BY THE TYPE CHECKER AND NEVER BY THE TEST RUNNER.
 *
 * `UnreachedCodes` collapses to `never` only while the hand-written list covers
 * the union whole. The moment it does not, the intersection below becomes
 * `never` and `tsc --noEmit` refuses the catalog — which is the only place a
 * code added to the contract and forgotten here can be caught, because vitest
 * transforms types away without reading them.
 *
 * The tuple wrapper on both sides of `extends` is load-bearing: it stops the
 * conditional distributing over the union, which would make a partially
 * covered catalog answer `unknown` rather than `never`.
 */
export const DECLARED_CODES = declaredCodes satisfies readonly DeclaredFaultCode[] &
  ([UnreachedCodes] extends [never] ? unknown : never);
