/**
 * What the `file-names` Module can assert about one file's NAME.
 *
 * The second Module, and the first test of design-ADR 0006's growth rule: "The
 * top level is one key per Module, and nothing else." It is a Module rather
 * than one more key on a frontmatter Rule for two measured reasons, both read
 * off `./config.types`:
 *
 *   - a key on `ConstrainingPayload` is UNREACHABLE for frontmatter-free files,
 *     because `NoFrontmatterPayload` sets every payload key to `never` — yet a
 *     README-only folder still needs naming discipline;
 *   - a key on `RuleCommon` makes the `frontmatter:` section govern what is not
 *     frontmatter, which 0006 settled against with "neither Module can name the
 *     other's data".
 *
 * It governs FILE NAMES ONLY. A `folder:` subject was designed and then dropped
 * on measurement — 0 of 26 in-corpus folder basenames here and 0 of 51 in the
 * second target corpus fail kebab-case, while file names proliferate. It
 * returns as ONE ADDITIVE OPTIONAL KEY beside `file:`, which is why `file:` is
 * still a named subject rather than flattened away.
 */

import type { Format } from './constraints.types';
import type { Glob, RuleCommon } from './rule-common.types';

// ---------------------------------------------------------------------------
// The Module's section
// ---------------------------------------------------------------------------

/** Everything the `file-names` Module reads. */
export interface FileNamesConfig {
  /**
   * The ordered rule list. REQUIRED, and a list for the same reason the
   * frontmatter Module's is: YAML mappings have no guaranteed order, and
   * first-match needs one.
   *
   * First-match is per Module, not across Modules. One file can have a winning
   * `frontmatter` Rule and a winning `file-names` Rule at once, and neither
   * ranks the other — which is what keeps this design's one refusal intact,
   * that there is no precedence dimension BETWEEN anything.
   *
   * An empty list is a config error, not an inert Module.
   */
  rules: FileNameRule[];
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * One entry in the ordered rule list: a selector, a reason, and a subject.
 *
 * `path` is the ONLY selector. The `fileName` sugar the frontmatter Module
 * offers is deliberately withheld here, and it is the trap that would make
 * every violation invisible: selecting by an exact file name while constraining
 * that same name means the Rule reaches exactly the files that already satisfy
 * it, so a misnamed file falls through unselected and is never reported.
 */
export type FileNameRule = RuleCommon & {
  /** Paths this rule governs, as globs. The only selector this Module offers. */
  path: Glob[];

  /**
   * What the file's own name must be. MANDATORY — it is the whole payload, and
   * a Rule asserting nothing is a config error.
   *
   * A named subject rather than constraints spread flat onto the Rule, on three
   * grounds. A returning `folder:` subject slots in beside it instead of
   * re-nesting every adopter's config; the dotted violation address `file.slug`
   * keeps naming a key that actually exists; and the segment vocabulary stays
   * out of `RuleCommon`'s namespace, where a segment named `intent` would
   * otherwise be newly expressible.
   */
  file: FileSubject;
};

// ---------------------------------------------------------------------------
// The subject
// ---------------------------------------------------------------------------

/**
 * What a name must be: either split into segments, or judged whole.
 *
 * Modelled as a union so the illegal state is unrepresentable rather than
 * merely documented, the same way `RulePayload` models the frontmatter
 * Module's two exclusivity rules.
 *
 * The subject measures the STEM — the basename with its final `.md` removed.
 * `isMarkdownFile` already makes `.md` the only possibility, so an extension
 * that cannot vary is not something a config should be asked to describe.
 */
export type FileSubject = SegmentedSubject | PlainSubject;

/**
 * A stem split on the fixed `__` delimiter, one declared segment per part.
 *
 * `segments:` is EXCLUSIVE OF ITS SIBLINGS — an object carrying it may carry
 * `intent:` and nothing else. Both exclusions are failures rather than
 * preferences: `format: kebab-case` over a `__`-joined stem can only ever fail,
 * because the delimiter is not in the grammar; and a whole-name `maxLength`
 * beside a set of per-segment caps silently disagrees with their sum, so the
 * two would report opposite advice about the same name.
 *
 * That is what "no whole-name length cap exists by construction" means, and its
 * scope is exactly this variant. `PlainSubject` below carries `maxLength`
 * freely, where it disagrees with nothing.
 */
export interface SegmentedSubject {
  /**
   * The declared parts, IN ORDER, split on `__`.
   *
   * The part count must EQUAL this list's length. Optional trailing segments
   * were rejected as the false clean: a stem with no delimiter is the common
   * case — 40 of 73 here and 6 of 13 in the second corpus — so `index` and
   * `README` would pass a category check by having no category at all.
   */
  segments: SegmentConstraints[];

  /**
   * Why this subject exists, in the config author's own words.
   *
   * NEAREST-WINS across the three tiers: a segment's own `intent` beats this
   * one, which beats the Rule's. That is the existing "a constraint-level
   * `intent` wins over the rule's" extended one tier, not a new rule.
   */
  intent?: string;

  /** Excluded: a per-segment bound and a whole-stem bound cannot both be right. */
  minLength?: never;
  /** Excluded on the same grounds as `minLength`. */
  maxLength?: never;
  /** Excluded: no named format admits the `__` a segmented stem must contain. */
  format?: never;
  /** Excluded: the parts are what is matched, never the joined stem. */
  pattern?: never;
  /** Excluded: a closed set of whole stems says nothing about the parts. */
  allowed?: never;
}

/**
 * A stem judged whole, with no delimiter meaning anything.
 *
 * This is where `__` is UNREMARKABLE. The delimiter means something only where
 * `segments:` is declared — a name containing one under a Rule with no
 * `segments:` is an ordinary name, and a repo with no `file-names` section
 * never reports one at all. A product-wide reservation was rejected: the
 * response contract has nowhere to put it, since a file governed only by
 * `frontmatter:` has no `file-names` block, and reporting it there would make
 * one Module name the other's data.
 *
 * `presence` is excluded from both variants: every file has a stem, so the
 * three presence outcomes are unreachable and the one code addressed to the
 * Operator — a constraint meeting the wrong shape — stays unreachable with
 * them. The three list keys are excluded because a name is not a list.
 */
export interface PlainSubject {
  /** Absent by construction — this variant is the one that judges the stem whole. */
  segments?: never;

  /** Minimum stem length. */
  minLength?: number;
  /** Maximum stem length. Legal here, and only here. */
  maxLength?: number;
  /** One of the named formats, applied to the whole stem. */
  format?: Format;
  /** A regular expression the whole stem must match. A sibling `intent` is MANDATORY. */
  pattern?: string;
  /** A closed set of permitted stems. */
  allowed?: NameAllowedValue[];
  /** Why this subject exists. Wins over the Rule's `intent` for this name. */
  intent?: string;
}

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

/**
 * What one part of a split stem must be.
 *
 * Its OWN narrower type rather than `FieldConstraints` reused, because four of
 * that shape's keys are unreachable here and one is actively wrong. `presence`
 * cannot fire — a part either exists or the count is wrong, which is a
 * different finding. The three list keys name lists, and a part is a string by
 * construction.
 *
 * No recursion: under a fixed `__` a nested segment has nothing left to split
 * on, so a segment may not carry its own `segments:`.
 */
export interface SegmentConstraints {
  /**
   * This part's name. MANDATORY, and unique across the list.
   *
   * It is the address a violation reports — `file.slug` — so an unnamed segment
   * has no locator. A positional index is the one identifier this language
   * cannot use, for the same reason `ruleId` gives: the ordering it would be
   * drawn from is the thing an author edits.
   *
   * Must be kebab-case. Not decoration: the reported address is dotted, so a
   * name carrying a `.` would make it unsplittable by the consumer reading it.
   */
  name: string;

  /** Minimum length of this part. */
  minLength?: number;
  /** Maximum length of this part. */
  maxLength?: number;
  /** One of the named formats, applied to this part alone. */
  format?: Format;
  /** A regular expression this part must match. A sibling `intent` is MANDATORY. */
  pattern?: string;
  /** A closed set of permitted values for this part. */
  allowed?: NameAllowedValue[];
  /**
   * Why THIS part exists. Wins over the subject's `intent` and the Rule's.
   *
   * The documented home for the sentence an agent is steered by, because a slug
   * is the part a Contributor actually chooses.
   */
  intent?: string;
}

/**
 * One permitted name or part, and what choosing it means.
 *
 * `value` is a STRING and nothing else, which is the one place this shape
 * narrows `AllowedValue`. YAML hands a bare `0006` over as a NUMBER, and this
 * repo's own six design-ADR filenames open with a digit run — so a permissive
 * `value` would let an Operator write a closed set that can never match the
 * strings it is compared against.
 *
 * A value may not contain `__`. That is refused at LOAD time, with
 * `CONFIG_INVALID_VALUE`, and it reaches `allowed[].value` and nothing else:
 * the check is string-only and single-spelled, so `includes('__')` is total
 * here. A `pattern` gets no such guard, deliberately — `__`, `_{2}`, `[_][_]`
 * and `\x5f\x5f` are one regex in four spellings, so a literal check there
 * would be a partial guard reporting success over the three it cannot see.
 */
export interface NameAllowedValue {
  /** The exact string this part must be. */
  value: string;

  /** What this value MEANS. Optional, but written-and-empty is a config error. */
  intent?: string;
}
