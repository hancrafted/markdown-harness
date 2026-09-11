/**
 * The seven file-name violation codes as a value, so that something can
 * enumerate them.
 *
 * They sit here rather than beside the shapes that carry them because a `types`
 * file may hold no runtime value at all (ARCH-005). `FileNameViolationCode` is
 * derived from this object, so the catalog and the contract cannot drift apart.
 *
 * EVERY CODE CARRIES A MODULE DIMENSION IN ITS SPELLING: `<module>__<outcome>`,
 * `__` between the two dimensions and `_` between words inside one. The module
 * dimension is the top-level config key transliterated — `file-names` becomes
 * `FILE_NAMES`.
 *
 * The reason is `config-error.types.ts`'s own stated reason for its `CONFIG_`
 * prefix: a code "is read in logs and transcripts far from the envelope that
 * scoped it". A bare `FORMAT_MISMATCH` shared with the frontmatter Module
 * cannot tell an agent whether to RENAME THE FILE or EDIT THE FRONTMATTER —
 * opposite repairs, which the catalog's own discrimination rule forbids
 * collapsing into one code.
 *
 * `__` rather than `_` because `CONFIG_INVALID_VALUE` cannot be split, and the
 * boundary cannot be faked: a Module key is kebab-case, and that spelling
 * forbids a doubled hyphen, so no Module name can transliterate to something
 * containing `__`.
 *
 * TWO DIMENSIONS, NOT THREE. `<module>__<rest>` stays prefix-compatible, so a
 * consumer can route on `FILE_NAMES__` without parsing further. A third
 * `<constraint>` dimension cannot be spelled for new codes without also
 * deciding that `VALUE_TOO_LONG` becomes `MAX_LENGTH__EXCEEDED`, which is a
 * change to eighteen codes in ten files.
 *
 * SEVEN, NOT EIGHTEEN, and the count is measured rather than chosen. Only five
 * of the frontmatter Module's eighteen can reach a name at all; the other
 * thirteen name presence, lists, frontmatter blocks or cross-field sets, none
 * of which a name has. `CONSTRAINT_SHAPE_MISMATCH` — the one code addressed to
 * the Operator — is unreachable here BY CONSTRUCTION, because a part of a name
 * is a string and there is no other shape for it to be.
 *
 * The catalog can only ever grow. A returning `folder:` subject adds members;
 * it never renames one.
 */
export const FILE_NAME_VIOLATION_CODES = {
  /**
   * The stem split into FEWER non-empty parts than `segments:` declares.
   *
   * Two codes for the count rather than one, on `exactlyOneOf`'s precedent: an
   * exact-count constraint fails in opposite directions and the repairs are
   * opposite — add a part, or remove one. A consumer holding a single
   * `SEGMENT_COUNT_MISMATCH` would have to compare the two numbers itself to
   * know which way to move.
   */
  FILE_NAMES__TOO_FEW_SEGMENTS: 'FILE_NAMES__TOO_FEW_SEGMENTS',

  /** The stem split into MORE non-empty parts than `segments:` declares. */
  FILE_NAMES__TOO_MANY_SEGMENTS: 'FILE_NAMES__TOO_MANY_SEGMENTS',

  /** `allowed` — the part, or the whole stem, sits outside the closed set. */
  FILE_NAMES__VALUE_NOT_ALLOWED: 'FILE_NAMES__VALUE_NOT_ALLOWED',

  /** `format` — not the named shape. Form only, no clock. */
  FILE_NAMES__FORMAT_MISMATCH: 'FILE_NAMES__FORMAT_MISMATCH',

  /** `pattern` — no match. The mandatory `intent` travels in `requirement`. */
  FILE_NAMES__PATTERN_MISMATCH: 'FILE_NAMES__PATTERN_MISMATCH',

  /** `minLength`. */
  FILE_NAMES__VALUE_TOO_SHORT: 'FILE_NAMES__VALUE_TOO_SHORT',

  /** `maxLength`. */
  FILE_NAMES__VALUE_TOO_LONG: 'FILE_NAMES__VALUE_TOO_LONG',
} as const;
