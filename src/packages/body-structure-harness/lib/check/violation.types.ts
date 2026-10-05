/**
 * What `body-structure` can find wrong with one file, and the Rule fragments
 * those findings carry.
 *
 * This Module's own shapes and codes (ARCH-008). The response contract is
 * generic over a finding, and `cli` unions `BodyStructureViolation` with every
 * other declared Module's findings — so nothing outside this Package names them.
 */

/** The kinds of block a section may hold, as written in `mayHold` and as reported in a finding. */
type BlockKindName = 'prose' | 'ordered-list' | 'unordered-list';

/**
 * One heading entry of a `body-structure` Rule, as the Operator wrote it, `intent` included.
 *
 * Declared apart from the section's `HeadingEntry` on purpose: this is the
 * wire format, and a response is read by tools that never see a config type.
 */
export interface HeadingRequirement {
  /** `heading` is exactly one heading; `enumeration` is a counted run of repeats. */
  purpose: 'heading' | 'enumeration';
  /** The level the matching heading sits at. */
  level: number;
  /** ECMAScript regular expression, `u` flag, searched over the heading's raw content. */
  pattern?: string;
  /** The exact titles the matching heading may take, each with its `intent` when written. */
  allowed?: readonly AllowedTitleRequirement[];
  /** `heading` only: `required` when absent. */
  presence?: 'required' | 'optional';
  /** `enumeration` only: fewest repeats. */
  minCount?: number;
  /** `enumeration` only: most repeats. */
  maxCount?: number;
  /** The kinds of block the entry's section may hold, an allowed set; absent leaves it unconstrained. */
  mayHold?: readonly BlockKindName[];
  /** What the section should contain: Steering, never enforced. */
  intent?: string;
  /** The nested spine walked under each heading this entry claims, verbatim. */
  headings?: readonly HeadingRequirement[];
}

/** One exact title of an entry's `allowed` list, as the Operator wrote it. */
export interface AllowedTitleRequirement {
  /** The title, compared whole and case-sensitively with the heading's raw content. */
  title: string;
  /** What a section under this title is for: Steering, never enforced. */
  intent?: string;
}

/**
 * Where a spine finding sits in the config: the index of its entry in each
 * `headings:` list from the Rule's own down (`[1]` at the top, `[1, 0]` one
 * list deeper), and, for a finding inside a nested list, the heading it was
 * found under.
 */
export interface EntryLocator {
  /** The index path from the Rule's top-level `headings:` list down to the entry. */
  entry: readonly number[];
  /** The raw inline source of the parent heading the nested spine was walked under; absent at the top level. */
  under?: string;
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
 * level, since each is repaired on its own. It has no `entry`
 * and no `found`: no entry owns it.
 */
export interface HeadingUndefinedViolation {
  /** The one outcome this shape reports. */
  violation: 'BODY_STRUCTURE__HEADING_UNDEFINED';
  /** The heading's level. */
  level: number;
  /** The heading's raw inline source. */
  content: string;
  /** The key, as the Rule wrote it: only `forbid` closes a spine. */
  requirement: { undefinedHeadings: 'forbid' };
}

/**
 * A section holding blocks of a kind its entry's `mayHold` does not list, one
 * per section and kind. A violation carries no line, so one
 * per block would make two paragraphs indistinguishable duplicates.
 */
export interface BlockKindNotAllowedViolation extends EntryLocator {
  /** The one outcome this shape reports. */
  violation: 'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED';
  /** The section's heading, as its raw inline source, which tells one repeat from another. */
  content: string;
  /** The offending kind. */
  kind: BlockKindName;
  /** How many blocks of that kind the section holds. */
  found: number;
  /** The entry, verbatim, so the allowed set travels with the finding. */
  requirement: HeadingRequirement;
}

/** A heading entry with no heading to claim, or whose heading lies before an earlier entry's. */
export interface HeadingEntryViolation extends EntryLocator {
  /** Which outcome fired. */
  violation: 'BODY_STRUCTURE__HEADING_MISSING' | 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER';
  /** The entry, verbatim, `intent` included. */
  requirement: HeadingRequirement;
}

/** An entry whose count disagrees with what it is: a `heading` that appears twice, or an enumeration out of bounds. */
export interface HeadingCountViolation extends EntryLocator {
  /** Which outcome fired. */
  violation:
    | 'BODY_STRUCTURE__HEADING_REPEATED'
    | 'BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM'
    | 'BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM';
  /** How many headings the entry accounts for. */
  found: number;
  /** The entry, verbatim, `intent` included. */
  requirement: HeadingRequirement;
}

/**
 * Everything `body-structure` can find wrong with one file's outline, under
 * the `<MODULE>__<OUTCOME>` code grammar #69 settled for a second Module.
 */
export type BodyStructureViolation =
  | LevelTooDeepViolation
  | HeadingUndefinedViolation
  | HeadingEntryViolation
  | HeadingCountViolation
  | BlockKindNotAllowedViolation;
