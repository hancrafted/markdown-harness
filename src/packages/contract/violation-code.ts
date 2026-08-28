/**
 * What went wrong, as a CODE — the outcome, never the clause alone.
 *
 * The previous shape discriminated on `constraint`, the key the Operator typed,
 * and that was a defect rather than a simplification. `presence` fails three
 * distinguishable ways and all three reported `constraint: 'presence'`, so a
 * consumer holding a violation could not tell whether to ADD the field or
 * DELETE it without comparing the requirement against the value itself. The
 * codebase already knew: `core/tests/check.test.ts` computes its violation
 * forms as `presence:${expected.presence}`, string-concatenating a split the
 * contract refused to carry.
 *
 * So the rule is one code per constraint, and MORE than one wherever a single
 * constraint fails in opposite directions. `presence` gets three and
 * `exactlyOneOf` gets two, because in each case the fix for one direction is the
 * reverse of the fix for the other.
 *
 * CAPITAL_SNAKE_CASE, and the casing carries meaning rather than taste. These
 * are the only tokens in a response that are OURS. Everything else a report
 * quotes — `presence: 'required'`, `unknownKeys: 'forbidden'`, every `allowed`
 * value — is the Operator's own word, lifted from their config verbatim, and
 * re-casing those would put words in their mouth. Upper is ours, lower is
 * theirs or the command line's. The line the report format draws is now visible
 * at a glance instead of only documented.
 *
 * A const object rather than a TypeScript `enum`, and that is a hard constraint
 * rather than a preference. This repo has NO BUILD STEP — `bin.mh` points at
 * `./src/cli.ts` and every script is `node src/cli.ts` — so Node's strip-only
 * TypeScript mode is the runtime, and it rejects `enum` outright:
 *
 *   SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]:
 *   TypeScript enum is not supported in strip-only mode
 *
 * Measured, not assumed. The const object gives strictly more than `enum`
 * would: `VIOLATION.MISSING_REQUIRED_FIELD` to author against, a closed union
 * for exhaustive switching, and erasability. `tsconfig.json` sets
 * `erasableSyntaxOnly` so the next person to reach for `enum` is stopped by
 * `npm run verify` rather than by a stack trace at run time.
 */

/**
 * The codes that fire at a FIELD ADDRESS, behind or at the presence gate.
 *
 * Every one of them reports the address's constraints verbatim as its
 * `requirement`, so they share one shape and are one type rather than twelve.
 */
export const FIELD_VIOLATION = {
  /** `presence: required`, and the address named nothing at all. */
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  /**
   * `presence: required`, and the key IS there but holds nothing — `description:`
   * and then a newline, or `''`, or `[]`, or `{}`.
   *
   * Distinct from `MISSING_REQUIRED_FIELD` on purpose, and the distinction is
   * tenet 7 spending money to avoid a silent-misparse class. A bare
   * `description:` is the classic YAML trap: the author believes they filled it
   * in, and the file says otherwise. Collapsing that into "you never wrote the
   * key" would describe the wrong mistake and send an agent to the wrong fix.
   */
  EMPTY_REQUIRED_FIELD: 'EMPTY_REQUIRED_FIELD',
  /** `presence: forbidden`, and the field is there. The fix is deletion, which is why it is not the code above. */
  FORBIDDEN_FIELD_PRESENT: 'FORBIDDEN_FIELD_PRESENT',

  /** `allowed` — the value is outside the closed set. */
  VALUE_NOT_ALLOWED: 'VALUE_NOT_ALLOWED',
  /** `format` — the value is not the named shape. Form only; nothing here consults a clock. */
  FORMAT_MISMATCH: 'FORMAT_MISMATCH',
  /** `pattern` — the value does not match. The mandatory sibling `intent` travels in `requirement`. */
  PATTERN_MISMATCH: 'PATTERN_MISMATCH',

  /** `minLength` — strings only. */
  VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',
  /** `maxLength` — strings only. */
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',
  /** `minItems` — lists only. */
  TOO_FEW_ITEMS: 'TOO_FEW_ITEMS',
  /** `maxItems` — lists only. */
  TOO_MANY_ITEMS: 'TOO_MANY_ITEMS',
  /** `itemMaxLength` — one entry of a list of strings is too long. The address carries the index. */
  ITEM_TOO_LONG: 'ITEM_TOO_LONG',

  /**
   * A shape-specific constraint met the wrong shape — `maxLength` over a list,
   * `minItems` over a string.
   *
   * THE ONE CODE ADDRESSED TO THE OPERATOR rather than to whoever wrote the
   * document. No edit to the markdown file can fix it: the config applied a
   * string constraint to a list, and the config is the thing that is wrong.
   * That is also why it is the single exception to one-code-per-constraint —
   * `requirement` already says which constraint was misapplied, and the fault
   * is identical whichever one it was.
   *
   * It exists because the alternative is worse in the exact way this vocabulary
   * was designed to prevent. `constraints.ts` cites Laravel's shape-agnostic
   * `min:18` silently meaning "18 digits" as the trap being avoided, and before
   * this code the three value checks answered a wrong-shaped value with
   * `return null` — silently passing. Reporting `VALUE_TOO_LONG` on a list
   * would be worse still: an agent would try to shorten it by characters.
   */
  CONSTRAINT_SHAPE_MISMATCH: 'CONSTRAINT_SHAPE_MISMATCH',
} as const;

/** The codes that concern the whole file or a set of addresses rather than one field. */
export const RULE_VIOLATION = {
  /** `unknownKeys: forbidden` — a top-level key this rule does not name. */
  UNKNOWN_KEY_FORBIDDEN: 'UNKNOWN_KEY_FORBIDDEN',
  /** `frontmatter: forbidden` — the rule declares its paths frontmatter-free, and this file has some. */
  FRONTMATTER_FORBIDDEN: 'FRONTMATTER_FORBIDDEN',

  /**
   * `exactlyOneOf`, and none of the named addresses is satisfied.
   *
   * Two codes rather than one, for the same reason `presence` has three:
   * `satisfied: []` and `satisfied: ['name', 'title']` fail this constraint for
   * OPPOSITE reasons, and the fix for one is the reverse of the fix for the
   * other. The satisfied set was already carried as evidence; the code now says
   * which way to read it.
   */
  EXACTLY_ONE_OF_NONE_PRESENT: 'EXACTLY_ONE_OF_NONE_PRESENT',
  /** `exactlyOneOf`, and more than one of the named addresses is satisfied. */
  EXACTLY_ONE_OF_MULTIPLE_PRESENT: 'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
  /** `anyOf`, and none of the named addresses is satisfied. Fails one way only. */
  ANY_OF_UNSATISFIED: 'ANY_OF_UNSATISFIED',
  /** `allOf`, and at least one named address is not satisfied. Fails one way only. */
  ALL_OF_UNSATISFIED: 'ALL_OF_UNSATISFIED',
} as const;

export type FieldViolationCode = (typeof FIELD_VIOLATION)[keyof typeof FIELD_VIOLATION];
export type RuleViolationCode = (typeof RULE_VIOLATION)[keyof typeof RULE_VIOLATION];
export type ViolationCode = FieldViolationCode | RuleViolationCode;

/**
 * Both tables in one object, for a consumer that wants to switch over every code
 * without knowing which family it came from.
 *
 * Split into two tables above rather than one, because the split is load-bearing
 * in the types: a field violation's `requirement` is `FieldConstraints` and a
 * rule violation's is not, so nothing can accidentally hand a cross-field code a
 * field's constraints.
 */
export const VIOLATION = { ...FIELD_VIOLATION, ...RULE_VIOLATION } as const;
