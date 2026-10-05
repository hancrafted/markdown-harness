/**
 * What this Module reads out of one file: its `type`, its body, and the body's
 * outline — its top-level headings in document order (design-ADR 0014), each
 * with the kinds of the blocks in the section it opens (design-ADR 0028).
 *
 * Only a heading that is a DIRECT child of the document counts; one nested in
 * a blockquote or a list item belongs to the container.
 */

import type { BlockKind } from '../section/section.types.ts';

/** One heading of the outline. */
export interface OutlineHeading {
  /** 1 to 6: the count of `#`, or 1 for a `===` and 2 for a `---` underline. */
  level: number;
  /**
   * The heading's RAW inline source: ATX markers, the closing sequence and the
   * surrounding whitespace removed, never rendered. A multi-line setext
   * heading keeps its line breaks as `\n`.
   */
  content: string;
}

/** One top-level heading and the section it opens: the blocks up to the next top-level heading of any level. */
export interface OutlineSection {
  /** The heading that opens the section. */
  heading: OutlineHeading;
  /** The kind of each block of the section that has one, in document order, one entry per block; transparent blocks are not listed. */
  blocks: readonly BlockKind[];
}
