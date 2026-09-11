/**
 * The seam between rule resolution and the platform's glob matcher.
 *
 * Resolution is a rule of the config language and must stay assertable without
 * a filesystem or a platform; matching a glob is a builtin's job. Naming the
 * matcher as a type lets the deterministic half take it as an argument.
 *
 * KNOWN DUPLICATION, recorded rather than hidden: `frontmatter-harness` holds
 * an identical `GlobMatcher`, `matchGlob` and `normalisePath`. ARCH-004 forbids
 * reaching into another Package's internals, so a second Module either copies
 * the seam or the seam becomes a Package. This prototype copies it, because
 * promoting it touches three tested files in a Module this effort was not
 * chartered to change. The promotion is the delivery map's, and the cost of
 * getting it wrong is two implementations of one portable behaviour — the same
 * failure `named-formats` was extracted to avoid.
 */

/**
 * Decides whether one glob selects one path.
 *
 * Glob first, path second — the argument order of the config's own vocabulary,
 * where a rule owns globs and is offered paths.
 */
export type GlobMatcher = (glob: string, path: string) => boolean;
