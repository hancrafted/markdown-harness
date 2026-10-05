/**
 * What the Core hands every Module about one file it read.
 *
 * The Core splits and parses; it never says what a field MEANS.
 * A Module takes `type`, a rule's addresses or a heading outline out of
 * what is here and nowhere else gets to look at the raw bytes' fences.
 */

/**
 * How far a file's frontmatter got.
 *
 * Four states, because the three failures stay distinguishable: a Module that
 * collapses `unterminated` into `unparseable` (frontmatter-harness) and one that
 * reads `unterminated` as "no body at all" (body-structure-harness) both start
 * from the same four-way answer.
 */
export type Frontmatter =
  /** No fence at all. */
  | { kind: 'absent' }
  /** A block opened and never closed. */
  | { kind: 'unterminated' }
  /** The block closed and will not parse, or parsed to a scalar or a list. */
  | { kind: 'unparseable' }
  /** The block parsed to a mapping, possibly an empty one. */
  | { kind: 'mapping'; data: Record<string, unknown> };

/** One file, split once: its parsed frontmatter and the Markdown after it. */
export interface ParsedDocument {
  readonly frontmatter: Frontmatter;
  /** The Markdown after the block: the whole file when there is none, empty when the block never closes. */
  readonly body: string;
}

/** One corpus file the Core read and parsed. */
export interface CorpusDocument extends ParsedDocument {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  readonly path: string;
}

/** A file that exists and would not open, which every caller answers with exit 2. */
export interface Unreadable {
  readonly kind: 'unreadable';
  /** The path the read was attempted at: the corpus root as written, joined to the file's own. */
  readonly path: string;
}

/** Every requested file, read and parsed, or the first one that would not open. */
export type CorpusRead = { kind: 'read'; documents: readonly CorpusDocument[] } | Unreadable;
