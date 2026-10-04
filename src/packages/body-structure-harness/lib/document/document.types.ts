/**
 * What this Module reads out of one file: its `type`, its body, and the body's
 * outline — its top-level headings in document order (design-ADR 0014).
 *
 * Only a heading that is a DIRECT child of the document counts; one nested in
 * a blockquote or a list item belongs to the container.
 */

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
