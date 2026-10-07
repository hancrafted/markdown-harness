/** One heading and the text it governs: from the heading line to the next heading at the same or a higher level. */
export interface Section {
  readonly level: number;
  readonly title: string;
  /** Character offsets into the document: the heading line start, and the first character of the next boundary. */
  readonly start: number;
  readonly end: number;
}

/** Which heading a carrier governs: its level and a title pattern. */
export interface SectionScope {
  readonly level: number;
  readonly titlePattern: string;
}
