/**
 * What the halves of the body check are handed:
 * the spine and what its walk found, every list walked at every depth, what
 * lists a heading besides the spine, and what each entry claimed.
 */

import type { HeadingEntry } from '../../section.ts';
import type { OutlineHeading, OutlineSection } from '../document/document.types.ts';
import type { EntryLocator } from './violation.types.ts';

/** Whether one heading matches one entry: its level, then its pattern searched or its allowed titles compared. */
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
  leftovers: ReadonlyMap<number, number>;
}

/**
 * One list walked over its stretch of the outline: the Rule's own `headings:`
 * over the whole body, or a nested spine over the headings under one heading
 * its parent entry claimed.
 */
export interface WalkedSpine {
  /** The index path of the parent entry, empty for the Rule's own list. */
  prefix: readonly number[];
  /** The parent heading's raw inline source; absent for the Rule's own list. */
  under?: string;
  /** The whole-outline position of the stretch's first heading: position 0 of `spine.outline`. */
  start: number;
  /** The list, its matchers, and its stretch of the outline. */
  spine: Spine;
  /** What walking the list over its stretch found. */
  walk: Walk;
}

/** What lists a heading besides the outline itself: whether the spine is closed, and every list walked, each over its own stretch. */
export interface Listing {
  /** `undefinedHeadings: forbid`. */
  closed: boolean;
  /** Every list walked, at every depth. */
  spines: readonly WalkedSpine[];
}

/** One entry, where it sits in the config, and the sections of the headings it claimed, in document order. */
export interface Placement {
  entry: HeadingEntry;
  locator: EntryLocator;
  sections: readonly OutlineSection[];
}
