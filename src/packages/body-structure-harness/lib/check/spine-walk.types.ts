/**
 * What the spine walk reads and what it leaves behind (design-ADR 0017).
 */

import type { HeadingEntry } from '../../section.ts';
import type { OutlineHeading } from '../document/document.types.ts';

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

/** The mutable position of a walk: the cursor, and every outline position an entry has taken. */
export interface WalkState {
  cursor: number;
  taken: Set<number>;
}

/** The result of a whole walk. */
export interface Walked {
  /** One finding per entry, in entry order. */
  findings: readonly EntryFinding[];
  /** Positions of the headings no entry claimed and no run took, in outline order. */
  leftovers: readonly number[];
}
