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

/** The field must appear (present and non-empty), or must not appear. */
export interface PresenceViolation extends ViolationCommon {
  constraint: 'presence';
  operand: 'required' | 'forbidden';
  found: Observed;
}

export type Violation = FrontmatterViolation | PresenceViolation;

/** Every constraint key that can appear as a `constraint` discriminant. */
export type ConstraintFired = Violation['constraint'];

/** Re-exported for the renderer's evidence table. */
export type { AllowedOption, Observed };
