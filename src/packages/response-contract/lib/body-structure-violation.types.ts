/**
 * What `body-structure` can find wrong with one file, and the Rule fragments
 * those findings carry (design-ADR 0019, 0025, 0027, 0028).
 *
 * Split from `violation.types.ts` so each stays under the file-length limit; the
 * union `Violation` there names `BodyStructureViolation` from here.
 */

/**
 * One heading entry of a `body-structure` Rule, as the Operator wrote it, `intent` included.
 *
 * Declared here rather than imported from the Module on purpose: this is the
 * wire format, a Module's section type belongs to its Module (ARCH-008 §1.4),
 * and a response is read by tools that never see a config type.
 */
export interface HeadingRequirement {
  /** `heading` is exactly one heading; `enumeration` is a counted run of repeats. */
  purpose: 'heading' | 'enumeration';
  /** The level the matching heading sits at. */
  level: number;
  /** ECMAScript regular expression, `u` flag, searched over the heading's raw content (design-ADR 0018). */
  pattern?: string;
  /** `heading` only: `required` when absent. */
  presence?: 'required' | 'optional';
  /** `enumeration` only: fewest repeats. */
  minCount?: number;
  /** `enumeration` only: most repeats. */
  maxCount?: number;
  /** The kinds of block the entry's section may hold, an allowed set; absent leaves it unconstrained (design-ADR 0028). */
  mayHold?: readonly ('prose' | 'ordered-list' | 'unordered-list')[];
  /** What the section should contain: Steering, never enforced. */
  intent?: string;
}

/** One level's heading vocabulary, as the Operator wrote it (design-ADR 0027). */
export interface VocabularyRequirement {
  /** The level the vocabulary holds. */
  level: number;
  /** The exact titles a heading at `level` may take. */
  allowed: readonly string[];
}

/** A level deeper than the Rule's `maxLevel`, one violation per level rather than per heading. */
export interface LevelTooDeepViolation {
  /** The one outcome this shape reports. */
  violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP';
  /** The level used. */
  level: number;
  /** How many headings sit at that level. */
  found: number;
  /** The limit, as the Rule wrote it. */
  requirement: { maxLevel: number };
}

/**
 * A heading no entry of a closed spine matches, one per heading and not per
 * level, since each is repaired on its own (design-ADR 0025). It has no `entry`
 * and no `found`: no entry owns it.
 */
export interface HeadingUndefinedViolation {
  /** The one outcome this shape reports. */
  violation: 'BODY_STRUCTURE__HEADING_UNDEFINED';
  /** The heading's level. */
  level: number;
  /** The heading's raw inline source (design-ADR 0014). */
  content: string;
  /** The key, as the Rule wrote it: only `forbid` closes a spine. */
  requirement: { undefinedHeadings: 'forbid' };
}

/**
 * A heading at a vocabulary's level whose raw content is none of its titles,
 * one per heading (design-ADR 0027). It has no `entry` and no `found`: no entry
 * owns it, and the requirement is the vocabulary item, so the Contributor reads
 * the whole list in the violation that names the stranger.
 */
export interface HeadingNotInVocabularyViolation {
  /** The one outcome this shape reports. */
  violation: 'BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY';
  /** The heading's level. */
  level: number;
  /** The heading's raw inline source (design-ADR 0014). */
  content: string;
  /** The vocabulary item for the heading's level, verbatim. */
  requirement: VocabularyRequirement;
}

/**
 * A section holding blocks of a kind its entry's `mayHold` does not list, one
 * per section and kind (design-ADR 0028). A violation carries no line, so one
 * per block would make two paragraphs indistinguishable duplicates.
 */
export interface BlockKindNotAllowedViolation {
  /** The one outcome this shape reports. */
  violation: 'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED';
  /** The zero-based index of the entry that claimed the section's heading. */
  entry: number;
  /** The section's heading, as its raw inline source, which tells one repeat from another. */
  content: string;
  /** The offending kind. */
  kind: 'prose' | 'ordered-list' | 'unordered-list';
  /** How many blocks of that kind the section holds. */
  found: number;
  /** The entry, verbatim, so the allowed set travels with the finding. */
  requirement: HeadingRequirement;
}

/** A heading entry with no heading to claim, or whose heading lies before an earlier entry's. */
export interface HeadingEntryViolation {
  /** Which outcome fired. */
  violation: 'BODY_STRUCTURE__HEADING_MISSING' | 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER';
  /** The zero-based index in the Rule's `headings:` list: the locator the Operator opens the config at. */
  entry: number;
  /** The entry, verbatim, `intent` included. */
  requirement: HeadingRequirement;
}

/** An entry whose count disagrees with what it is: a `heading` that appears twice, or an enumeration out of bounds. */
export interface HeadingCountViolation {
  /** Which outcome fired. */
  violation:
    | 'BODY_STRUCTURE__HEADING_REPEATED'
    | 'BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM'
    | 'BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM';
  /** The zero-based index in the Rule's `headings:` list. */
  entry: number;
  /** How many headings the entry accounts for, design-ADR 0017. */
  found: number;
  /** The entry, verbatim, `intent` included. */
  requirement: HeadingRequirement;
}

/**
 * Everything `body-structure` can find wrong with one file's outline, under
 * the `<MODULE>__<OUTCOME>` code grammar #69 settled for a second Module
 * (design-ADR 0019).
 */
export type BodyStructureViolation =
  | LevelTooDeepViolation
  | HeadingUndefinedViolation
  | HeadingNotInVocabularyViolation
  | HeadingEntryViolation
  | HeadingCountViolation
  | BlockKindNotAllowedViolation;
