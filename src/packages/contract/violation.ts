/**
 * One thing wrong with one file — discriminated on `constraint`, THE KEY THE
 * OPERATOR LITERALLY TYPED.
 *
 * This union is where the load-bearing decision of the whole design shows up:
 * **the data carries no English.** `constraint` plus evidence is a complete
 * basis for every sentence the tool can say, so a `message` field would store
 * one fact twice and two representations of one fact drift — the silent-defect
 * class tenet 7 says to spend money avoiding.
 *
 * Four things stop being conventions and become unrepresentable:
 *
 *   - No field anywhere holds a regex. The `pattern` variant is the only one
 *     with NO `operand`, deliberately: a mandatory sibling `intent` carries the
 *     meaning instead. This is the failure Kubernetes accepts
 *     (`"failed rule: {Rule}"`) and VS Code bolted `patternErrorMessage` on to
 *     avoid.
 *   - There is no "ungoverned" variant to report into.
 *   - The rule reference hoists to the file, not to the violation, so a merged
 *     report has nowhere to live.
 *   - Author prose cannot substitute for the harness's sentence, because the
 *     data holds no sentence to substitute for.
 *
 * Two absences worth naming. No `severity`: severity tiers are CONTESTED rather
 * than merely open, and a field nothing varies pre-empts the decision. No
 * `line`/`column`: line attribution is a property of one YAML library, and
 * importing it into the specification is what tenet 4 exists to prevent — for
 * `sources[1].resource` the instance address is the better locator anyway.
 */

import type { FieldAddress } from './constraints.ts';
import type { AllowedOption, Observed } from './values.ts';

/** Carried by every variant, whatever fired. */
interface ViolationCommon {
  /**
   * The instance address the constraint fired at — `slug`, `generated.by`,
   * `sources[1].resource`, with the list index RESOLVED rather than left as
   * `[]`. `null` for a rule-level constraint that names no single field.
   */
  at: FieldAddress | null;
  /**
   * Why the constraint exists, in the Operator's own words, verbatim.
   *
   * The EFFECTIVE intent: a constraint-level `intent` wins over the rule's, and
   * resolving that is a semantic of the config language rather than a display
   * choice, so it happens behind the seam. Never null — a rule's `intent` is
   * mandatory, so there is always a fallback.
   *
   * Appended to the harness's own sentence, never substituted for it.
   */
  intent: string;
}

/**
 * The rule declares its paths frontmatter-free, and this file has frontmatter.
 *
 * No `operand`: `forbidden` is the only value the key can hold, and a field that
 * never varies is a constant stored in every record.
 */
export interface FrontmatterViolation extends ViolationCommon {
  constraint: 'frontmatter';
  at: null;
  found: Observed;
}

/**
 * The value is outside the closed set the rule permits.
 *
 * `operand` is the WHOLE set, uncapped and in config order, each entry with its
 * meaning. That is what lets the failure be fixed without opening the config,
 * and it is why an `allowed` entry is a record rather than a bare string: a
 * config that mixed the two forms would make a partial map the display source.
 */
export interface AllowedViolation extends ViolationCommon {
  constraint: 'allowed';
  operand: readonly AllowedOption[];
  found: Observed;
}

/**
 * The value does not match the rule's regular expression.
 *
 * THE ONE VARIANT WITH NO `operand`, and the reason no field anywhere in this
 * contract holds a regex. The config language makes a sibling `intent`
 * mandatory beside `pattern` precisely so that this variant has something to
 * say without it.
 */
export interface PatternViolation extends ViolationCommon {
  constraint: 'pattern';
  found: Observed;
}

/**
 * A frontmatter key this rule does not name, under `unknownKeys: forbidden`.
 *
 * No `operand`: `forbidden` is the only value that can produce a violation.
 * `known` is carried instead, because it is not recoverable from the report
 * alone and every violation stanza has to be self-sufficient — the Contributor
 * fixing this one should not need the config to learn what the rule does name.
 */
export interface UnknownKeysViolation extends ViolationCommon {
  constraint: 'unknownKeys';
  at: FieldAddress;
  /** The TOP-LEVEL segments of the rule's addresses, deduped, in config order. */
  known: readonly string[];
  found: Observed;
}

/** The three constraints that name several addresses and assert something about the set. */
export type CrossFieldConstraint = 'exactlyOneOf' | 'anyOf' | 'allOf';

/**
 * A set of addresses the rule named, and the wrong number of them present.
 *
 * `at` is null because the constraint names no single field. Evidence is the
 * SATISFIED SET rather than a count: `satisfied: []` and
 * `satisfied: ['name', 'title']` fail `exactlyOneOf` for opposite reasons, and a
 * count could not tell a Contributor which arm to remove.
 */
export interface CrossFieldViolation extends ViolationCommon {
  constraint: CrossFieldConstraint;
  at: null;
  /** The addresses the rule named, in config order. */
  operand: readonly FieldAddress[];
  /** Which of them were present and non-empty. */
  satisfied: readonly FieldAddress[];
}

/** The field must appear (present and non-empty), or must not appear. */
export interface PresenceViolation extends ViolationCommon {
  constraint: 'presence';
  operand: 'required' | 'forbidden';
  found: Observed;
}

export type Violation =
  | AllowedViolation
  | CrossFieldViolation
  | FrontmatterViolation
  | PatternViolation
  | PresenceViolation
  | UnknownKeysViolation;

/** Every constraint key that can appear as a `constraint` discriminant. */
export type ConstraintFired = Violation['constraint'];

/** Re-exported for the renderer's evidence table. */
export type { AllowedOption, Observed };
