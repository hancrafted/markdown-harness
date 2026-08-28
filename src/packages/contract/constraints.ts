/**
 * What a rule can assert about one frontmatter field.
 *
 * Split from `./config` at a real seam: that module answers "which files does
 * this rule select, and what kind of thing does it assert", this one answers
 * "what must be true of one value". The two change for different reasons — a
 * new selector touches the resolver, a new constraint touches the checker.
 */

/**
 * A frontmatter field address.
 *
 * Reaches exactly one level into nested shapes. A top-level-only vocabulary
 * could not express the nested keys real specs require — OKF alone binds a
 * producer at `generated.by` and `sources[].resource`, both nested.
 *
 *   description          a top-level key
 *   generated.by         a key inside a mapping
 *   sources[].resource   a key inside EVERY entry of a list
 *
 * The bracket notation is OKF's own: the pinned revision writes `sources[].id`
 * (§5.1), `sources[].resource` twice (§6.2) and `verified[].by` (§7). Adopted,
 * not invented — other path languages disagree with each other and with
 * themselves.
 *
 * Addressing a list entry and addressing the list itself are different
 * addresses, so a per-entry constraint and a container constraint never share a
 * shape:
 *
 *   sources:            { minItems: 1 }        the list
 *   sources[].resource: { presence: required } every entry
 */
export type FieldAddress = string;

/**
 * What must be true of one field.
 *
 * Every key is optional; a constraint object stating nothing is a config error.
 * Keys are shape-specific by construction — `minLength` names strings,
 * `minItems` names lists — which is what keeps this vocabulary out of Laravel's
 * trap, where a shape-agnostic `min:18` silently meant "18 digits".
 *
 * There is no built-in table of which spec-defined key has which shape. The
 * ancestor of this file carried one for OKF, because a `.rules.ts` could not
 * import a shared copy. OKF now ships as a preset config rather than as
 * behaviour, so a list of the keys one spec happens to define has no place in
 * the config language.
 */
export interface FieldConstraints {
  /**
   * Whether the field must appear.
   *
   * `required` means PRESENT AND NON-EMPTY, which is why there is no
   * `minLength: 1` anywhere.
   *
   * Three named states rather than a boolean: `required: false` genuinely reads
   * both as "may be absent" and "must be absent".
   */
  presence?: 'required' | 'optional' | 'forbidden';

  /** Minimum length, STRINGS ONLY. A three-item list does not satisfy `minLength: 3`. */
  minLength?: number;
  /** Maximum length, strings only. */
  maxLength?: number;

  /** One of the named formats. */
  format?: Format;

  /**
   * A regular expression the value must match.
   *
   * The one expressiveness valve: without it, anything outside the named
   * formats would be inexpressible forever.
   *
   * A sibling `intent` is MANDATORY whenever this is present, and it is what
   * the violation reports. Without it the raw regex leaks into the message —
   * the failure Kubernetes accepts (`"failed rule: {Rule}"`) and VS Code bolted
   * `patternErrorMessage` on to avoid.
   */
  pattern?: string;

  /** Minimum number of entries, LISTS ONLY. */
  minItems?: number;
  /** Maximum number of entries, lists only. */
  maxItems?: number;
  /** Maximum length of each entry of a list of strings. */
  itemMaxLength?: number;

  /**
   * A closed set of permitted values. Replaces wholesale, never appends — an
   * appending allowlist could only ever widen, which makes it useless as a
   * restriction.
   *
   * This is where a repo's `type` vocabulary is written, and with the Floor gone
   * it is the only place. Nothing subsets it, because there is no longer a
   * ceiling to subset.
   */
  allowed?: AllowedValue[];

  /**
   * Why THIS constraint exists. Optional, except mandatory alongside `pattern`.
   *
   * Wins over the rule's `intent` for violations of this field, and travels
   * inside the violation's verbatim `requirement` fragment. Nothing appends it
   * to a message of ours, because there is no message: the report format holds
   * no prose we wrote.
   */
  intent?: string;
}

/**
 * One permitted value, and what choosing it means.
 *
 * A record rather than a bare string, everywhere, with no shorthand: a failed
 * membership check prints the whole allowed set with each value's `intent`,
 * uncapped, so a config that mixed the two forms would make a partial map the
 * display source. Records also let an entry gain fields later without a
 * breaking change.
 */
export interface AllowedValue {
  /** The value that must appear in the frontmatter. */
  value: string | number | boolean;

  /**
   * What this value MEANS, in one sentence.
   *
   * Optional, but `intent: ""` and a bare `intent:` are both config errors —
   * writing the key and saying nothing is worse than omitting it.
   */
  intent?: string;
}

/**
 * The named formats. Not sugar: `actor` is the clearest case for a name over a
 * regex — a three-way alternation that is unreadable written out and
 * self-evident written as `format: actor`.
 */
export type Format =
  /** ISO 8601 with an explicit UTC offset. */
  | 'datetime'
  /** A path or URI. */
  | 'uri'
  /** `<producer>/<version>` | `human:<id>` | `process:<id>`. */
  | 'actor';
