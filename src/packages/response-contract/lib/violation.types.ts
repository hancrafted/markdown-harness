/**
 * What one thing wrong with one file looks like in a report.
 *
 * Every member carries the config fragment that failed rather than a sentence of
 * ours (§4). A stored `message` would hold one fact twice, and two
 * representations of one fact drift; the code, the value found and the fragment
 * are a complete basis for every sentence a consumer could compose.
 */

import type { FieldConstraints } from '../../config-contract/index.ts';

/**
 * The eighteen codes (§4.7), discriminated on the OUTCOME rather than the
 * constraint alone.
 *
 * `presence` fails three distinguishable ways, and a consumer holding
 * `constraint: 'presence'` cannot tell whether to add the field or delete it.
 * One code per constraint, and more than one wherever a single constraint fails
 * in opposite directions.
 *
 * A union of string literals rather than an `enum`: `enum` is the one
 * TypeScript construct with no type-erasure, so it emits runtime code Node
 * cannot strip, and the entry path is executed by Node directly. The sibling
 * `ConfigFaultCode` is spelled the same way for the same reason.
 *
 * These carry no `CONFIG_` prefix by design: the audience is the Contributor's
 * agent, and every one of them is fixable by editing markdown.
 */
export type FieldViolationCode =
  /** `presence: required`, and the address named nothing at all. */
  | 'MISSING_REQUIRED_FIELD'
  /** `presence: required`, key written but empty — the classic YAML trap. */
  | 'EMPTY_REQUIRED_FIELD'
  /** `presence: forbidden`, and the field is there. The fix is deletion. */
  | 'FORBIDDEN_FIELD_PRESENT'
  /** `allowed` — the value sits outside the closed set. */
  | 'VALUE_NOT_ALLOWED'
  /** `format` — not the named shape. Form only, no clock. */
  | 'FORMAT_MISMATCH'
  /** `pattern` — no match. The mandatory `intent` travels in `requirement`. */
  | 'PATTERN_MISMATCH'
  /** `minLength`, strings only. */
  | 'VALUE_TOO_SHORT'
  /** `maxLength`, strings only. */
  | 'VALUE_TOO_LONG'
  /** `minItems`, lists only. */
  | 'TOO_FEW_ITEMS'
  /** `maxItems`, lists only. */
  | 'TOO_MANY_ITEMS'
  /** `itemMaxLength` — the address carries the index. */
  | 'ITEM_TOO_LONG'
  /**
   * A shape-specific constraint met the wrong shape (`maxLength` on a list).
   *
   * THE ONE CODE ADDRESSED TO THE OPERATOR — no markdown edit can fix a
   * misapplied config. `VALUE_TOO_LONG` is never reported on a list: an agent
   * would shorten it by characters.
   */
  | 'CONSTRAINT_SHAPE_MISMATCH'
  /** `unknownKeys: forbidden` — a top-level key the rule does not name. */
  | 'UNKNOWN_KEY_FORBIDDEN'
  /** `frontmatter: forbidden` — and the file has frontmatter. */
  | 'FRONTMATTER_FORBIDDEN'
  /** `exactlyOneOf`, failing because none of the named addresses is satisfied. */
  | 'EXACTLY_ONE_OF_NONE_PRESENT'
  /** `exactlyOneOf`, failing because more than one is. */
  | 'EXACTLY_ONE_OF_MULTIPLE_PRESENT'
  /** `anyOf`, none satisfied. */
  | 'ANY_OF_UNSATISFIED'
  /** `allOf`, at least one missing or empty (§3.3). */
  | 'ALL_OF_UNSATISFIED';

/**
 * The evidence a violation carries about the value it found.
 *
 * ABSENCE IS THE KEY'S OMISSION, NOT `null`. A violation whose address named
 * nothing has no `value` key at all, which is what lets `null` keep its literal
 * meaning here.
 *
 * Containers contribute their size, never their contents — `sources` is
 * unbounded and violations repeat per file across a corpus.
 */
export type FieldValue =
  | string
  | number
  | boolean
  /** The key was written with no value: `description:` then a newline. */
  | null
  /** A list: how many entries, never which. */
  | { items: number }
  /** A mapping: which keys, never their values. */
  | { keys: readonly string[] };

/** Everything that can be wrong with one file. */
export type Violation =
  | FieldViolation
  | UnknownKeyViolation
  | FrontmatterForbiddenViolation
  | FrontmatterUnparseableViolation
  | CrossFieldViolation;

/** A constraint on one field failed. */
export interface FieldViolation {
  /**
   * The field address that failed (§3.2).
   *
   * A per-entry constraint reports the address WITH its index —
   * `sources[1].resource` rather than `sources[].resource` — because the
   * response carries no line or column and the concrete address is the better
   * locator. The `requirement` beside it stays the fragment as written.
   */
  field: string;
  /** ABSENT AS A KEY when the address named nothing at all. */
  value?: FieldValue;
  /** Which outcome fired. */
  violation: FieldViolationCode;
  /** The field's constraints, VERBATIM from the config, including any `intent`. */
  requirement: FieldConstraints;
}

/** A top-level key the rule does not name, under `unknownKeys: forbidden`. */
export interface UnknownKeyViolation {
  /** The offending top-level key. */
  field: string;
  /** What was found under it. */
  value?: FieldValue;
  /** The one outcome this shape reports. */
  violation: 'UNKNOWN_KEY_FORBIDDEN';
  /**
   * The one non-verbatim requirement in any response: `allowedKeys` is derived
   * — the top-level segments of the rule's addresses, deduped, in config order
   * — because a Contributor cannot be required to open the config to learn what
   * was permitted.
   */
  requirement: { unknownKeys: 'forbidden'; allowedKeys: readonly string[] };
}

/** The rule declares its paths frontmatter-free, and this file has frontmatter anyway. */
export interface FrontmatterForbiddenViolation {
  /** No single field: the fault is the block's existence. */
  field: null;
  /**
   * The block's top-level keys, so the fix is legible without opening the file.
   *
   * OMITTED when the block did not parse — the keys cannot be extracted from
   * bytes that never became data.
   */
  value?: FieldValue;
  /** The one outcome this shape reports. */
  violation: 'FRONTMATTER_FORBIDDEN';
  /** The payload as written. */
  requirement: { frontmatter: 'forbidden' };
}

/**
 * The block exists and does not parse (§4.7).
 *
 * File-level, and outside the eighteen: no field address is at fault and no
 * config fragment failed, so neither `value` nor `requirement` is present — the
 * keys are unknowable and nothing in the config was disobeyed.
 */
export interface FrontmatterUnparseableViolation {
  /** No single field: the fault is the block's bytes. */
  field: null;
  /** The one outcome this shape reports. */
  violation: 'FRONTMATTER_UNPARSEABLE';
}

/** A set constraint failed. `satisfied` is the set, not a count. */
export interface CrossFieldViolationOf<Key extends string, Code extends string> {
  /** No single field: the constraint names a set of addresses. */
  field: null;
  /** Which of the named addresses were satisfied — the set, so the fix is a subtraction. */
  satisfied: readonly string[];
  /** Which outcome fired. */
  violation: Code;
  /** The constraint as written: its key, and the addresses it names. */
  requirement: Record<Key, readonly string[]>;
}

/**
 * The three set constraints, each with the codes it can fail with.
 *
 * `exactlyOneOf` carries two because it fails in opposite directions and the
 * repairs are opposite — remove one, add one. `anyOf` and `allOf` can each fail
 * only one way, so one code is the whole of either.
 */
export type CrossFieldViolation =
  | CrossFieldViolationOf<'exactlyOneOf', 'EXACTLY_ONE_OF_NONE_PRESENT' | 'EXACTLY_ONE_OF_MULTIPLE_PRESENT'>
  | CrossFieldViolationOf<'anyOf', 'ANY_OF_UNSATISFIED'>
  | CrossFieldViolationOf<'allOf', 'ALL_OF_UNSATISFIED'>;
