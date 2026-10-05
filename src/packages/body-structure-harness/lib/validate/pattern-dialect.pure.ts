/**
 * The heading-pattern dialect as config validation needs it:
 * ECMAScript with the `u` flag and no other, searched and never anchored.
 */

/**
 * One literal character of an anchored literal: any character the dialect gives
 * no meaning to, or a backslash followed by one it does.
 */
const LITERAL_RUN = /^\^(?:[^\\^$.|?*+()[\]{}]|\\[\\^$.|?*+()[\]{}])*\$$/u;

/**
 * The one place the dialect is built: a pattern as a `RegExp` with the `u` flag
 * and no other. Validation asks whether it compiles; matching searches with it.
 *
 * @param pattern The pattern as the Operator wrote it; throws when the engine refuses it.
 */
export function dialectPattern(pattern: string): RegExp {
  return new RegExp(pattern, 'u');
}

/**
 * Whether a string compiles as a regular expression under the `u` flag, the
 * dialect. A pattern the engine refuses could never fire,
 * and `^Source\-` is one: an unnecessary escape is a syntax error under `u`.
 *
 * @param pattern The pattern as the Operator wrote it.
 */
export function compiles(pattern: string): boolean {
  try {
    dialectPattern(pattern);
    return true;
  } catch {
    return false;
  }
}

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
