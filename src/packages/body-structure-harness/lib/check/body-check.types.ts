/**
 * What the two outline-driven halves of the check are handed (design-ADR 0027,
 * 0028): what names a heading besides the spine, and what each entry claimed.
 */

import type { HeadingEntry, VocabularyItem } from '../../section.ts';
import type { OutlineHeading, OutlineSection } from '../document/document.types.ts';

/** What names a heading besides the spine: whether the spine is closed, the vocabularies, and one matcher per entry. */
export interface Naming {
  /** `undefinedHeadings: forbid`. */
  closed: boolean;
  /** The Rule's heading vocabulary: one item per level it holds. */
  vocabulary: readonly VocabularyItem[];
  /** One per entry of the Rule's spine, which may have none. */
  matchers: readonly ((heading: OutlineHeading) => boolean)[];
}

/** One entry, its index in the spine, and the sections of the headings it claimed, in document order. */
export interface Claim {
  entry: HeadingEntry;
  index: number;
  sections: readonly OutlineSection[];
}
