/**
 * What a caller hands `markdown-harness`.
 *
 * Part of the portable artifact (tenet 4) because it is half of what a
 * reimplementation is verified against: feed a port the same JSON values and
 * compare the report. There are no filesystem semantics here to
 * reverse-engineer — all I/O sits at the caller's edge, in `src/cli.ts`.
 */

/** A repo-root-relative path, `/`-separated, with no leading `./` or `/`. */
export type RepoPath = string;

/**
 * One markdown file, as read.
 *
 * FULL file text, `---` fences included, and deliberately not a pre-split
 * frontmatter block: the fence grammar is the difference between "no
 * frontmatter" and "forbidden frontmatter present", so it is specification and
 * belongs behind the seam rather than in every caller.
 */
export interface SourceFile {
  path: RepoPath;
  text: string;
}

/**
 * The tree under consideration.
 *
 * This is the seam a filesystem port would have sat at, and the reason no such
 * port exists: one adapter is a hypothetical seam. `fixtures/` IS the
 * specification, so tests run against the real tree and a second adapter would
 * have no customer.
 *
 * Ungoverned files are never read (tenet 6), so a caller may hand over a corpus
 * of paths whose `text` it only bothered to load for the files a rule names.
 */
export interface Corpus {
  root: string;
  files: readonly SourceFile[];
}
