/**
 * One thing wrong with one file — discriminated on `violation`, THE OUTCOME.
 *
 * It used to be discriminated on `constraint`, the key the Operator literally
 * typed, and that read as the more honest choice: quote their vocabulary, add
 * nothing of ours. It was wrong, and `violation-code.ts` records the measurement
 * that showed it. Naming the clause leaves the DIRECTION unstated, and for
 * `presence` — the constraint that fires more than every other combined — the
 * two directions want opposite repairs. A code says which.
 *
 * `requirement` is the config fragment that failed, VERBATIM. That single
 * decision is what keeps a message layer out of this contract: the fragment
 * already contains the constraint, its operand, and its `intent` where the
 * Operator wrote one, so there is nothing left for a stored sentence to add. It
 * costs nothing to produce and it always shows the WHOLE picture rather than the
 * one clause that happened to fire — which is what an agent about to rewrite the
 * field actually needs, and what stops it satisfying `presence` on this run only
 * to fail `pattern` on the next.
 *
 * So prose of ours is still absent, and the codes are not a reversal of that.
 * `MISSING_REQUIRED_FIELD` is a discriminant, not a sentence: it has no wording
 * to keep in step with anything, no translation, and no reader who has to be
 * shown it rather than switch on it. What the report format deleted was a stored
 * `message` that duplicated free text the Operator can rewrite at will, and
 * nothing here reintroduces one.
 *
 * Two absences worth naming. No `severity`: severity tiers are CONTESTED rather
 * than merely open, and a field nothing varies pre-empts the decision. No
 * `line`/`column`: line attribution is a property of one YAML library, and
 * importing it into the specification is what tenet 4 exists to prevent — for
 * `sources[1].resource` the instance address is the better locator anyway.
 *
 * One guarantee was deliberately traded away here, and it belongs on the record
 * rather than being discovered later. An earlier shape made a regex in a report
 * UNREPRESENTABLE — the failure Kubernetes accepts (`"failed rule: {Rule}"`) and
 * VS Code bolted `patternErrorMessage` on to avoid. A verbatim fragment
 * necessarily carries `pattern`. The reasoning for accepting that: the consumer
 * is an agent, which is better served by the regex than by prose, and the
 * Operator on the other side wrote the regex in the first place. That prior art
 * is about END USERS, and per `CONTEXT.md` the Contributor never opens the config
 * and is reached through their agent. The guarantee is now a property of what a
 * consumer chooses to show a human, not of what the data is able to hold.
 */

import type { FieldAddress, FieldConstraints } from './constraints.ts';
import type { FieldValue } from './values.ts';
import type { FieldViolationCode } from './violation-code.ts';

/**
 * Carried by every violation that names a place a value was or should have been.
 *
 * `value` is ABSENT AS A KEY when the address named nothing, which is what keeps
 * `value: null` meaning "written, and holds nothing". The code says which of the
 * two happened, so no consumer has to infer it from the key's presence — but the
 * key's presence never lies either.
 */
interface Located {
  field: FieldAddress;
  value?: FieldValue;
}

/**
 * A constraint on one field failed.
 *
 * One interface for all twelve field codes rather than twelve generic
 * instantiations, because the shape is genuinely identical: what differs is only
 * WHICH clause of `requirement` fired, and that is exactly what `violation`
 * says. `violation` still narrows the union as a whole, because the codes in
 * `FIELD_VIOLATION` and `RULE_VIOLATION` are disjoint by construction.
 */
export interface FieldViolation extends Located {
  violation: FieldViolationCode;
  /** The field's constraints, verbatim from the config, including its own `intent` if it has one. */
  requirement: FieldConstraints;
}

/**
 * A frontmatter key this rule does not name, under `unknownKeys: forbidden`.
 *
 * The one `requirement` that is not purely verbatim. `unknownKeys: forbidden`
 * alone would not say what the rule DOES name, and a Contributor fixing this
 * cannot be required to open the config, so `allowedKeys` is derived and travels
 * with it: the top-level segments of the rule's addresses, deduped, in config
 * order.
 */
export interface UnknownKeyViolation extends Located {
  violation: 'UNKNOWN_KEY_FORBIDDEN';
  requirement: { unknownKeys: 'forbidden'; allowedKeys: readonly string[] };
}

/** The rule declares its paths frontmatter-free, and this file has frontmatter. */
export interface FrontmatterForbiddenViolation {
  /** No single field: the fault is the whole block's existence. */
  field: null;
  /** The block's top-level keys, so the fix is legible without opening the file. */
  value?: FieldValue;
  violation: 'FRONTMATTER_FORBIDDEN';
  requirement: { frontmatter: 'forbidden' };
}

/**
 * A set of addresses the rule named, and the wrong number of them satisfied.
 *
 * `field` is null because the constraint names no single field. `satisfied` is
 * the SET rather than a count, and it sits in its own key rather than in `value`
 * because it is not a value that was at an address — it is which of several
 * addresses were populated.
 *
 * Generic over the code as well as the key, so `exactlyOneOf` can carry its two
 * opposite outcomes without either arm losing the narrowing that makes
 * `requirement` exactly one key wide.
 */
/** The three constraints that name several addresses and assert something about the set. */
export type CrossFieldConstraint = 'exactlyOneOf' | 'anyOf' | 'allOf';

export interface CrossFieldViolationOf<Key extends string, Code extends string> {
  field: null;
  satisfied: readonly FieldAddress[];
  violation: Code;
  requirement: Record<Key, readonly FieldAddress[]>;
}

export type CrossFieldViolation =
  | CrossFieldViolationOf<'exactlyOneOf', 'EXACTLY_ONE_OF_NONE_PRESENT' | 'EXACTLY_ONE_OF_MULTIPLE_PRESENT'>
  | CrossFieldViolationOf<'anyOf', 'ANY_OF_UNSATISFIED'>
  | CrossFieldViolationOf<'allOf', 'ALL_OF_UNSATISFIED'>;

export type Violation = FieldViolation | UnknownKeyViolation | FrontmatterForbiddenViolation | CrossFieldViolation;
