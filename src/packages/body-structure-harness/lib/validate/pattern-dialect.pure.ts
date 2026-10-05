/**
 * What this Module asks of a heading pattern beyond the config's one dialect,
 * which `foundation` builds for every Module: that it is non-empty, and whether
 * it is an anchored literal.
 */

import { compiles } from '../../../foundation/pattern-dialect.ts';

/**
 * One literal character of an anchored literal: any character the dialect gives
 * no meaning to, or a backslash followed by one it does.
 */
const LITERAL_RUN = /^\^(?:[^\\^$.|?*+()[\]{}]|\\[\\^$.|?*+()[\]{}])*\$$/u;

/**
 * Whether a written `pattern` is one this Module accepts: a non-empty string
 * that compiles under the `u` flag.
 *
 * @param value A `pattern` straight off the YAML.
 */
export function isPattern(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && compiles(value);
}

/**
 * Whether a pattern is an anchored literal: it begins `^`,
 * ends in an unescaped `$`, and everything between is a run of literal
 * characters. A syntactic test, never a proof of how many strings the pattern
 * matches: `^(Pros|Cons)$` is not one, however few strings it admits.
 *
 * @param pattern A pattern that already compiles.
 */
export function isAnchoredLiteral(pattern: string): boolean {
  return LITERAL_RUN.test(pattern);
}
