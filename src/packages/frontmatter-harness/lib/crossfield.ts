/**
 * `exactlyOneOf` / `anyOf` / `allOf` — the constraints that name several
 * addresses and assert something about the SET.
 *
 * "Satisfied" reuses the presence gate's emptiness predicate, so `required`,
 * `anyOf` and the rest all agree on what it means for a field to be there:
 * present AND non-empty. A separate notion of presence for cross-field keys
 * would be a second answer to one question.
 *
 * Evidence is the SATISFIED SET, not a count. `satisfied: []` and
 * `satisfied: ['name', 'title']` fail `exactlyOneOf` for opposite reasons, and a
 * count could not tell the Contributor which arm to remove.
 */

import type { ConstrainingPayload } from '../../contract/config.ts';
import type { FieldAddress } from '../../contract/constraints.ts';
import type { Frontmatter } from '../../contract/frontmatter.ts';
import type { CrossFieldConstraint, CrossFieldViolationOf, Violation } from '../../contract/violation.ts';
import { instances } from './address.ts';
import { isEmpty } from './presence.ts';

/** An address is satisfied when it reaches at least one non-empty instance. */
function satisfies(frontmatter: Frontmatter, address: FieldAddress): boolean {
  const reached = instances(frontmatter, address);
  return reached.length > 0 && reached.every((instance) => !isEmpty(instance.value));
}

const HOLDS: Record<CrossFieldConstraint, (satisfied: number, of: number) => boolean> = {
  exactlyOneOf: (satisfied) => satisfied === 1,
  anyOf: (satisfied) => satisfied >= 1,
  allOf: (satisfied, of) => satisfied === of,
};

/**
 * Generic over the key, so the constructed literal has type
 * `CrossFieldViolationOf<K>` and needs no cast. A non-generic builder taking
 * `constraint: CrossFieldConstraint` would produce a value TypeScript cannot
 * match to any single member of the union.
 */
function crossCheck<Key extends CrossFieldConstraint>(
  constraint: Key,
  operand: readonly FieldAddress[] | undefined,
  context: { frontmatter: Frontmatter; intent: string },
): readonly CrossFieldViolationOf<Key>[] {
  if (operand === undefined) return [];
  const satisfied = operand.filter((address) => satisfies(context.frontmatter, address));
  if (HOLDS[constraint](satisfied.length, operand.length)) return [];
  return [{ constraint, at: null, operand, satisfied, intent: context.intent }];
}

export function crossField(
  payload: ConstrainingPayload,
  frontmatter: Frontmatter,
  intent: string,
): readonly Violation[] {
  const context = { frontmatter, intent };
  return [
    ...crossCheck('exactlyOneOf', payload.exactlyOneOf, context),
    ...crossCheck('anyOf', payload.anyOf, context),
    ...crossCheck('allOf', payload.allOf, context),
  ];
}
