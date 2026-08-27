/**
 * One thing wrong with one file — discriminated on `constraint`, THE KEY THE
 * OPERATOR LITERALLY TYPED.
 *
 * `expected` is the config fragment that failed, VERBATIM. That single decision
 * is what removed the message layer from this contract: the fragment already
 * contains the constraint, its operand, and its `intent` where the Operator
 * wrote one, so there is nothing left for a stored sentence to add. It costs
 * nothing to produce and it always shows the whole picture rather than the one
 * clause that happened to fire — which is what an agent about to rewrite the
 * field actually needs.
 *
 * It is also why nothing here holds prose of ours. `constraint` says which
 * clause failed, `found` says what was there, `expected` says what the config
 * asked for in the config's own words. The renderer serialises `expected` back
 * to YAML and adds no sentences, so a wording change is not a thing that can
 * exist in this layer at all.
 *
 * Two absences worth naming. No `severity`: severity tiers are CONTESTED rather
 * than merely open, and a field nothing varies pre-empts the decision. No
 * `line`/`column`: line attribution is a property of one YAML library, and
 * importing it into the specification is what tenet 4 exists to prevent — for
 * `sources[1].resource` the instance address is the better locator anyway.
 *
 * One guarantee was deliberately traded away here, and it belongs on the record
 * rather than being discovered later. The previous shape made a regex in a
 * report UNREPRESENTABLE — the failure Kubernetes accepts
 * (`"failed rule: {Rule}"`) and VS Code bolted `patternErrorMessage` on to
 * avoid. A verbatim fragment necessarily carries `pattern`. The reasoning for
 * accepting that: there are two consumers on two channels. `--json` is read by
 * an agent, which is better served by the regex than by prose; the plain text is
 * read by the Operator, who wrote the regex. That prior art is about END USERS,
 * and per `CONTEXT.md` the Contributor never opens the config and is reached
 * through their agent — through the JSON. The guarantee is now a property of
 * what the renderer chooses to print, not of what the data is able to hold.
 */

import type { FieldAddress, FieldConstraints } from './constraints.ts';
import type { Observed } from './values.ts';

/** Carried by every variant, whatever fired. */
interface ViolationCommon {
  /**
   * The instance address the constraint fired at — `slug`, `generated.by`,
   * `sources[1].resource`, with the list index RESOLVED rather than left as
   * `[]`. `null` for a rule-level constraint that names no single field.
   */
  field: FieldAddress | null;
}

/**
 * Every constraint key that sits UNDER a field address, and therefore reports
 * the field's constraints verbatim.
 *
 * The list grows as checks land. `presence` is the gate; the rest sit behind it.
 */
export type FieldConstraintKey = 'presence' | 'allowed' | 'format' | 'pattern';

/**
 * A constraint on one field failed.
 *
 * Generic over the key rather than written out four times, because the shape is
 * genuinely identical: what differs is only WHICH clause of `expected` fired,
 * and that is exactly what `constraint` says.
 */
export interface FieldViolation<Key extends FieldConstraintKey> extends ViolationCommon {
  constraint: Key;
  field: FieldAddress;
  found: Observed;
  /** The field's constraints, verbatim from the config, including its own `intent` if it has one. */
  expected: FieldConstraints;
}

/**
 * A frontmatter key this rule does not name, under `unknownKeys: forbidden`.
 *
 * The one variant whose `expected` is not purely verbatim. `unknownKeys:
 * forbidden` alone would not say what the rule DOES name, and a Contributor
 * fixing this cannot be required to open the config, so `allowedKeys` is derived
 * and travels with it: the top-level segments of the rule's addresses, deduped,
 * in config order.
 */
export interface UnknownKeysViolation extends ViolationCommon {
  constraint: 'unknownKeys';
  field: FieldAddress;
  found: Observed;
  expected: { unknownKeys: 'forbidden'; allowedKeys: readonly string[] };
}

/** The rule declares its paths frontmatter-free, and this file has frontmatter. */
export interface FrontmatterViolation extends ViolationCommon {
  constraint: 'frontmatter';
  field: null;
  found: Observed;
  expected: { frontmatter: 'forbidden' };
}

/** The three constraints that name several addresses and assert something about the set. */
export type CrossFieldConstraint = 'exactlyOneOf' | 'anyOf' | 'allOf';

/**
 * A set of addresses the rule named, and the wrong number of them present.
 *
 * `field` is null because the constraint names no single field. `found` is the
 * SATISFIED SET rather than a count: `[]` and `['name', 'title']` fail
 * `exactlyOneOf` for opposite reasons, and a number could not tell a
 * Contributor which arm to remove.
 */
export interface CrossFieldViolationOf<Key extends CrossFieldConstraint> extends ViolationCommon {
  constraint: Key;
  field: null;
  found: { satisfied: readonly FieldAddress[] };
  expected: Record<Key, readonly FieldAddress[]>;
}

/**
 * Written as three members rather than one interface with a union-typed
 * `constraint`, so that `constraint` is a TRUE discriminant.
 */
export type CrossFieldViolation =
  CrossFieldViolationOf<'exactlyOneOf'> | CrossFieldViolationOf<'anyOf'> | CrossFieldViolationOf<'allOf'>;

export type Violation =
  | FieldViolation<'presence'>
  | FieldViolation<'allowed'>
  | FieldViolation<'format'>
  | FieldViolation<'pattern'>
  | UnknownKeysViolation
  | FrontmatterViolation
  | CrossFieldViolation;
