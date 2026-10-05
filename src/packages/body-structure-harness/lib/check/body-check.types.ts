/**
 * What the halves of the body check are handed:
 * the spine and what its walk found, what lists a heading besides the spine,
 * and what each entry claimed.
 */

import type { HeadingEntry, VocabularyItem } from '../../section.ts';
import type { OutlineHeading, OutlineSection } from '../document/document.types.ts';

/** Whether one heading matches one entry: its level, then its pattern searched over the raw content. */
export type HeadingMatcher = (heading: OutlineHeading) => boolean;

/** The spine and the outline it is walked against, with one matcher per entry. */
export interface Spine {
  entries: readonly HeadingEntry[];
  matchers: readonly HeadingMatcher[];
  outline: readonly OutlineHeading[];
}

/** What the walk found for one entry. */
export interface EntryFinding {
  /** The position of the heading a `heading` entry claimed, when it claimed one. */
  claimed: number | undefined;
  /** For an `enumeration`: the positions of the headings of its run it matches. */
  repeats: readonly number[];
  /** Whether a `heading` entry found no heading at or after the cursor but one before it. */
  misplaced: boolean;
}

/** What walking a spine over an outline found: one finding per entry, and how many leftover headings each entry was given. */
export interface Walk {
  /** One finding per entry, in index order. */
  findings: readonly EntryFinding[];
  /** For each entry index, how many leftover headings it was given: repeats of a `heading`, or repeats an enumeration found outside its run. */
  given: ReadonlyMap<number, number>;
}

/** What lists a heading besides the outline itself: whether the spine is closed, the vocabularies, and one matcher per entry. */
export interface Listing {
  /** `undefinedHeadings: forbid`. */
  closed: boolean;
  /** The Rule's heading vocabulary: one item per level it holds. */
  vocabulary: readonly VocabularyItem[];
  /** One per entry of the Rule's spine, which may have none. */
  matchers: readonly HeadingMatcher[];
}

/** One entry, its index in the spine, and the sections of the headings it claimed, in document order. */
export interface Claim {
  entry: HeadingEntry;
  index: number;
  sections: readonly OutlineSection[];
}
