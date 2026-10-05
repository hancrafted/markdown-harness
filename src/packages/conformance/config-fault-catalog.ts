// The fault catalog the rejected-config tier claims to cover, written by hand.
//
// HAND-WRITTEN DELIBERATELY, for the reason the frontmatter runner already
// states about its case count: a list derived from the thing it is checking
// cannot fail. Generating this from `ConfigFaultCode` would make coverage and
// closure agree with the contract by construction, and a retired code would
// leave the tier silently one case heavier than the catalog it specifies.
//
// The cost of writing it by hand is drift, and the pin below is what pays it.

import type { ConfigFaultCode } from '../config-contract/index.ts';

/**
 * Every code the tier undertakes to reach, in the order §3.5's catalog declares
 * them: the four that name the config FILE first, then the eleven that name a
 * key inside it.
 *
 * The `satisfies` check holds one direction — a code spelled wrong, or one the
 * catalog never had, does not compile. Its intersection holds the other.
 *
 * Twenty-six. It was twenty-one, before the five codes the heading vocabulary and the section content bring (#227,
 * design-ADRs 0027 and 0028); twenty, before `CONFIG_MAX_LEVEL_ON_CLOSED_SPINE` (#225, design-ADR 0026); fifteen, before the five
 * `body-structure` codes of #221 below that; and fourteen before that: `CONFIG_SELECTOR_AMBIGUOUS` was retired with the
 * grammar that made it reachable — `folders:` and `fileNames:` intersect rather
 * than exclude, so a rule carrying both is spelling an exact path rather than
 * asking two questions at once — and its case directory was deleted in the same
 * change. `CONFIG_NO_MODULE_SECTION` arrived the other way round, with
 * `rejected-config/no-module-section/` beside it in the same change. Halves that
 * land apart leave the suite red in one direction or the other, which is the
 * machinery working rather than a hole to paper over: a code with no case fails
 * coverage, and a case with no code fails closure.
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
  'CONFIG_DUPLICATE_VOCABULARY_LEVEL',
  'CONFIG_DUPLICATE_VOCABULARY_TITLE',
  'CONFIG_VOCABULARY_BEYOND_MAX_LEVEL',
  'CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES',
  'CONFIG_DUPLICATE_BLOCK_KIND',
] as const;

/**
 * The five codes the heading vocabulary and the section content bring (#227, design-ADRs 0027 and 0028).
 *
 * Declared here before the contract's `ConfigFaultCode` union names them, as #221's and #225's Phase 2 did
 * for theirs: the tier is written first and the Module second. Widening the pin below by exactly these
 * codes keeps `tsc --noEmit` green until the union gains them, and drops out of the way after: a code the
 * union later names is simply a member of both sides. The implementation agent deletes this bridge in the
 * commit that adds the codes to the contract.
 */
type PendingCode =
  | 'CONFIG_DUPLICATE_VOCABULARY_LEVEL'
  | 'CONFIG_DUPLICATE_VOCABULARY_TITLE'
  | 'CONFIG_VOCABULARY_BEYOND_MAX_LEVEL'
  | 'CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES'
  | 'CONFIG_DUPLICATE_BLOCK_KIND';

/** Whatever the catalog declares and the list above has not claimed. */
type UnreachedCodes = Exclude<ConfigFaultCode, (typeof declaredCodes)[number]>;

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
export const DECLARED_CODES = declaredCodes satisfies readonly (ConfigFaultCode | PendingCode)[] &
  ([UnreachedCodes] extends [never] ? unknown : never);
