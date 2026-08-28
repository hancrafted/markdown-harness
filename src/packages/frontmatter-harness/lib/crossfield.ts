/**
 * `exactlyOneOf` / `anyOf` / `allOf` — the constraints that name several
 * addresses and assert something about the SET.
 *
 * "Satisfied" reuses the presence gate's emptiness predicate, so `required`,
 * `anyOf` and the rest all agree on what it means for a field to be there:
 * present AND non-empty. A separate notion of presence for cross-field keys
 * would be a second answer to one question.
 *
 * Evidence is the SATISFIED SET, not a count, and the CODE says which way to
 * read it. `satisfied: []` and `satisfied: ['name', 'title']` fail
 * `exactlyOneOf` for opposite reasons — one wants an arm added, the other wants
 * one removed — so that constraint has two codes where the other two have one
 * each. The set was already carried; before the split, deciding which repair to
 * make meant counting it.
 */

import type { ConstrainingPayload } from '../../contract/config.ts';
import type { FieldAddress } from '../../contract/constraints.ts';
import type { Frontmatter } from '../../contract/frontmatter.ts';
import { RULE_VIOLATION, type RuleViolationCode } from '../../contract/violation-code.ts';
import type { CrossFieldConstraint, CrossFieldViolationOf, Violation } from '../../contract/violation.ts';
import { instances } from './address.ts';
import { isEmpty } from './presence.ts';

/** An address is satisfied when it reaches at least one non-empty instance. */
function satisfies(frontmatter: Frontmatter, address: FieldAddress): boolean {
  const reached = instances(frontmatter, address);
  return reached.length > 0 && reached.every((instance) => !isEmpty(instance.value));
}

/**
 * The key and how it fails, together — a Clause.
 *
 * One parameter rather than two because they are one fact: `anyOf` and "fails
 * only when nothing is satisfied" are the same statement, and ESLint's
 * `max-params` cap of 3 is the nudge that made the pair explicit rather than a
 * reason to smuggle it past.
 */
interface Clause<Key extends CrossFieldConstraint, Code extends RuleViolationCode> {
  constraint: Key;
  outcome: (satisfied: number, of: number) => Code | null;
}

/**
 * Generic over the key AND the code, so the constructed literal has type
 * `CrossFieldViolationOf<Key, Code>` and needs no cast. A non-generic builder
 * taking `constraint: CrossFieldConstraint` would produce a value TypeScript
 * cannot match to any single member of the union.
 */
function crossCheck<Key extends CrossFieldConstraint, Code extends RuleViolationCode>(
  { constraint, outcome }: Clause<Key, Code>,
  operand: readonly FieldAddress[] | undefined,
  frontmatter: Frontmatter,
): readonly CrossFieldViolationOf<Key, Code>[] {
  if (operand === undefined) return [];
  const satisfied = operand.filter((address) => satisfies(frontmatter, address));
  const violation = outcome(satisfied.length, operand.length);
  if (violation === null) return [];

  return [
    {
      field: null,
      satisfied,
      violation,
      // Verbatim: the rule-level key and the addresses it named, as written.
      requirement: { [constraint]: operand } as Record<Key, readonly FieldAddress[]>,
    },
  ];
}

/** The one constraint that fails in two directions, so it is the one with two codes. */
function exactlyOne(satisfied: number): 'EXACTLY_ONE_OF_NONE_PRESENT' | 'EXACTLY_ONE_OF_MULTIPLE_PRESENT' | null {
  if (satisfied === 1) return null;
  return satisfied === 0 ? RULE_VIOLATION.EXACTLY_ONE_OF_NONE_PRESENT : RULE_VIOLATION.EXACTLY_ONE_OF_MULTIPLE_PRESENT;
}

const EXACTLY_ONE_OF: Clause<'exactlyOneOf', 'EXACTLY_ONE_OF_NONE_PRESENT' | 'EXACTLY_ONE_OF_MULTIPLE_PRESENT'> = {
  constraint: 'exactlyOneOf',
  outcome: exactlyOne,
};

const ANY_OF: Clause<'anyOf', 'ANY_OF_UNSATISFIED'> = {
  constraint: 'anyOf',
  outcome: (satisfied) => (satisfied >= 1 ? null : RULE_VIOLATION.ANY_OF_UNSATISFIED),
};

const ALL_OF: Clause<'allOf', 'ALL_OF_UNSATISFIED'> = {
  constraint: 'allOf',
  outcome: (satisfied, of) => (satisfied === of ? null : RULE_VIOLATION.ALL_OF_UNSATISFIED),
};

export function crossField(payload: ConstrainingPayload, frontmatter: Frontmatter): readonly Violation[] {
  return [
    ...crossCheck(EXACTLY_ONE_OF, payload.exactlyOneOf, frontmatter),
    ...crossCheck(ANY_OF, payload.anyOf, frontmatter),
    ...crossCheck(ALL_OF, payload.allOf, frontmatter),
  ];
}
