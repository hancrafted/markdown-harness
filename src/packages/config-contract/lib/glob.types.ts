/**
 * The one path-matching vocabulary the config language has.
 *
 * Its own file, and the reason is structural rather than stylistic. Both
 * Modules take path globs — `frontmatter:` in a rule's selector and its
 * `excludeFiles`, `indexes:` in a directory's `excludeFiles` — so leaving the
 * declaration inside `config.types` made the second Module's types import the
 * first Module's, while `config.types` already imported the second's to place
 * its section on `MarkdownHarnessConfig`. That is a cycle, and
 * `dependency-cruiser` caught it on the first run.
 *
 * What the cycle was telling us is worth keeping: a glob is not the
 * `frontmatter:` Module's property. It is shared vocabulary, and shared
 * vocabulary belongs beside neither of the things sharing it.
 */

/**
 * A glob, matched against repo-root-relative paths.
 *
 * ROOT-RELATIVE IN EVERY SECTION. A glob meaning different things in different
 * Modules would be the same trap as a list whose order means nothing sitting
 * beside one where order is everything — and the contract already carries one
 * deliberate two-meanings collision in `frontmatter:`, documented as real
 * rather than an oversight. One is a known cost; two is a pattern.
 */
export type Glob = string;
