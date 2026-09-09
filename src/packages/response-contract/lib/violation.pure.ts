/**
 * The eighteen violation codes as a value, so that something can enumerate them.
 *
 * They sit here rather than beside the shapes that carry them because a `types`
 * file may hold no runtime value at all — not a function, not a constant
 * (ARCH-005). `FieldViolationCode` is derived from this object, so the catalog
 * and the contract cannot drift apart: there is one list, and the type reads it.
 *
 * A `const` object rather than an `enum`, and the reason is the wire rather than
 * the runtime. These codes travel as JSON: a consumer reads `"VALUE_TOO_LONG"`
 * out of a response and compares it against a string. A string `enum` member is
 * a nominal type — the plain string does not satisfy it — so every consumer
 * would have to import the enum to speak the contract. This object's values ARE
 * the strings, which is what lets a stored response compare equal.
 *
 * The older reason recorded elsewhere in this Package — that `enum` is the one
 * construct Node's type-stripping cannot erase — no longer stands on its own:
 * `cli.ts` records that the entry path is compiled now, so the compiler would
 * emit an `enum` correctly. Nothing here needs one regardless.
 *
 * Every key is spelled the same as its value, so a lookup and a literal are
 * interchangeable and neither reads as the authority over the other.
 *
 * The order is the specification's (§4.7), not alphabetical: the constraint
 * codes run in the order the constraints are declared, and the set constraints
 * close the list. `FRONTMATTER_UNPARSEABLE` is deliberately absent — it is
 * file-level and outside the eighteen, because no field address is at fault.
 *
 * These carry no `CONFIG_` prefix by design: the audience is the Contributor's
 * agent, and every one of them is fixable by editing markdown.
 */
export const FIELD_VIOLATION_CODES = {
  /** `presence: required`, and the address named nothing at all. */
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  /** `presence: required`, key written but empty — the classic YAML trap. */
  EMPTY_REQUIRED_FIELD: 'EMPTY_REQUIRED_FIELD',
  /** `presence: forbidden`, and the field is there. The fix is deletion. */
  FORBIDDEN_FIELD_PRESENT: 'FORBIDDEN_FIELD_PRESENT',
  /** `allowed` — the value sits outside the closed set. */
  VALUE_NOT_ALLOWED: 'VALUE_NOT_ALLOWED',
  /** `format` — not the named shape. Form only, no clock. */
  FORMAT_MISMATCH: 'FORMAT_MISMATCH',
  /** `pattern` — no match. The mandatory `intent` travels in `requirement`. */
  PATTERN_MISMATCH: 'PATTERN_MISMATCH',
  /** `minLength`, strings only. */
  VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',
  /** `maxLength`, strings only. */
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',
  /** `minItems`, lists only. */
  TOO_FEW_ITEMS: 'TOO_FEW_ITEMS',
  /** `maxItems`, lists only. */
  TOO_MANY_ITEMS: 'TOO_MANY_ITEMS',
  /** `itemMaxLength` — the address carries the index. */
  ITEM_TOO_LONG: 'ITEM_TOO_LONG',
  /**
   * A shape-specific constraint met the wrong shape (`maxLength` on a list).
   *
   * THE ONE CODE ADDRESSED TO THE OPERATOR — no markdown edit can fix a
   * misapplied config. `VALUE_TOO_LONG` is never reported on a list: an agent
   * would shorten it by characters.
   */
  CONSTRAINT_SHAPE_MISMATCH: 'CONSTRAINT_SHAPE_MISMATCH',
  /** `unknownKeys: forbidden` — a top-level key the rule does not name. */
  UNKNOWN_KEY_FORBIDDEN: 'UNKNOWN_KEY_FORBIDDEN',
  /** `frontmatter: forbidden` — and the file has frontmatter. */
  FRONTMATTER_FORBIDDEN: 'FRONTMATTER_FORBIDDEN',
  /** `exactlyOneOf`, failing because none of the named addresses is satisfied. */
  EXACTLY_ONE_OF_NONE_PRESENT: 'EXACTLY_ONE_OF_NONE_PRESENT',
  /** `exactlyOneOf`, failing because more than one is. */
  EXACTLY_ONE_OF_MULTIPLE_PRESENT: 'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
  /** `anyOf`, none satisfied. */
  ANY_OF_UNSATISFIED: 'ANY_OF_UNSATISFIED',
  /** `allOf`, at least one missing or empty (§3.3). */
  ALL_OF_UNSATISFIED: 'ALL_OF_UNSATISFIED',
} as const;
