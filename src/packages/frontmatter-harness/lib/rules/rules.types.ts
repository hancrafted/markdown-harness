/**
 * The seam between rule resolution and the platform's glob matcher.
 *
 * Resolution is a rule of the config language and must stay assertable without
 * a filesystem or a platform; matching a glob is a builtin's job. Naming the
 * matcher as a type lets the deterministic half take it as an argument.
 */

/**
 * Decides whether one glob selects one path.
 *
 * Glob first, path second — the argument order of the config's own vocabulary,
 * where a rule owns globs and is offered paths.
 */
export type GlobMatcher = (glob: string, path: string) => boolean;
