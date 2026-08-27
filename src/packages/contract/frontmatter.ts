/**
 * Frontmatter as a value, once YAML is behind us.
 *
 * The Module is handed one of these and knows nothing about files, globs or
 * YAML — which is what lets the nine constraint families be pinned without a
 * filesystem anywhere near the test.
 *
 * `null` for the whole mapping means ABSENT. It never means unparseable: a
 * broken block that read as "absent" would make a `frontmatter: forbidden` rule
 * PASS on it, and a silent false negative is the one bug a trust tool cannot
 * have. The Core reports that case as its own fault variant and never calls the
 * Module at all.
 */

export type FrontmatterValue = string | number | boolean | null | readonly FrontmatterValue[] | FrontmatterMapping;

/*
 * An interface with an index signature, rather than a `Record`, and not a style
 * choice: `Record` is a mapped type and so is not deferred, which makes
 * `FrontmatterValue` circularly reference itself (TS2456). This is the only
 * spelling of a recursive mapping that compiles.
 */
export interface FrontmatterMapping {
  readonly [key: string]: FrontmatterValue;
}

/** A parsed mapping, or `null` for no frontmatter at all. */
export type Frontmatter = FrontmatterMapping | null;
