/**
 * The three set constraints: `exactlyOneOf`, `anyOf`, `allOf`.
 *
 * Each reports the SATISFIED SET rather than a count, so the repair is a
 * subtraction a reader can perform without opening the file. `exactlyOneOf`
 * earns two codes because it fails in opposite directions and the repairs are
 * opposite — remove one, add one; the other two can each fail only one way.
 *
 * Satisfaction is "present and non-empty", the same emptiness
 * `presence: required` uses and `EMPTY_REQUIRED_FIELD` reports. One definition
 * of empty in this tool, not two, which is what stops `title: ''` from
 * satisfying `allOf: [title, description]`.
 *
 * The three are written out rather than driven from a key list. Each carries a
 * different failure condition and a different `requirement` key, and a computed
 * key would widen the requirement to an index signature — which is to say it
 * would erase exactly the discrimination §4.6 declares the shape for.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { CrossFieldViolation } from '../../../response-contract/index.ts';
import type { FrontmatterMapping } from './check.types.ts';
import { resolveAddress } from './field-address.pure.ts';
import { isEmptyValue } from './field-evidence.pure.ts';

/**
 * Whether one address in a set counts as satisfied.
 *
 * A set may name a nested address, so this goes through the same resolver the
 * field checks use rather than reading a top-level key directly. One reached
 * site holding something non-empty is enough — an address that resolves to
 * nothing, or to a container of the wrong shape, has satisfied nothing.
 */
function isSatisfied(address: string, data: FrontmatterMapping): boolean {
  const resolved = resolveAddress(address, data);
  if (resolved.kind !== 'sites') return false;
  return resolved.sites.some((site) => site.present && !isEmptyValue(site.value));
}

/** Which of the named addresses the file satisfies, in the order the set named them. */
function satisfiedIn(addresses: readonly string[], data: FrontmatterMapping): readonly string[] {
  return addresses.filter((address) => isSatisfied(address, data));
}

/** Exactly one, failing in either direction. */
function exactlyOneOfViolation(
  exactlyOneOf: readonly string[],
  data: FrontmatterMapping,
): CrossFieldViolation | undefined {
  const satisfied = satisfiedIn(exactlyOneOf, data);
  if (satisfied.length === 1) return undefined;
  return {
    // `field: null` because the constraint names a SET of addresses and no
    // single one of them is at fault.
    field: null,
    satisfied,
    violation: satisfied.length === 0 ? 'EXACTLY_ONE_OF_NONE_PRESENT' : 'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
    requirement: { exactlyOneOf },
  };
}

/** At least one. Can fail only one way, so it carries one code. */
function anyOfViolation(anyOf: readonly string[], data: FrontmatterMapping): CrossFieldViolation | undefined {
  const satisfied = satisfiedIn(anyOf, data);
  if (satisfied.length > 0) return undefined;
  return { field: null, satisfied, violation: 'ANY_OF_UNSATISFIED', requirement: { anyOf } };
}

/** All of them. There is no such thing as satisfying too many arms of it. */
function allOfViolation(allOf: readonly string[], data: FrontmatterMapping): CrossFieldViolation | undefined {
  const satisfied = satisfiedIn(allOf, data);
  if (satisfied.length === allOf.length) return undefined;
  return { field: null, satisfied, violation: 'ALL_OF_UNSATISFIED', requirement: { allOf } };
}

/**
 * Evaluate every set constraint the rule wrote.
 *
 * Returned in the order §4.6 declares them: `exactlyOneOf`, `anyOf`, `allOf`.
 *
 * @param rule The rule that won this file under first-match.
 * @param data The file's parsed frontmatter mapping.
 */
export function crossFieldViolations(rule: FrontmatterRule, data: FrontmatterMapping): readonly CrossFieldViolation[] {
  const { exactlyOneOf, anyOf, allOf } = rule;

  const found = [
    exactlyOneOf === undefined ? undefined : exactlyOneOfViolation(exactlyOneOf, data),
    anyOf === undefined ? undefined : anyOfViolation(anyOf, data),
    allOf === undefined ? undefined : allOfViolation(allOf, data),
  ];

  return found.filter((one): one is CrossFieldViolation => one !== undefined);
}
