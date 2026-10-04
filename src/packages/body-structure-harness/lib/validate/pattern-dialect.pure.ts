/**
 * The heading-pattern dialect as config validation needs it (design-ADR 0018):
 * ECMAScript with the `u` flag and no other, searched and never anchored.
 */

/**
 * One literal character of an anchored literal: any character the dialect gives
 * no meaning to, or a backslash followed by one it does.
 */
const LITERAL_RUN = /^\^(?:[^\\^$.|?*+()[\]{}]|\\[\\^$.|?*+()[\]{}])*\$$/u;

/**
 * Whether a string compiles as a regular expression under the `u` flag, the
 * dialect of design-ADR 0018. A pattern the engine refuses could never fire,
 * and `^Source\-` is one: an unnecessary escape is a syntax error under `u`.
 *
 * @param pattern The pattern as the Operator wrote it.
 */
export function compiles(pattern: string): boolean {
  try {
    new RegExp(pattern, 'u');
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether a pattern is an anchored literal (design-ADR 0018): it begins `^`,
 * ends in an unescaped `$`, and everything between is a run of literal
 * characters. A syntactic test, never a proof of how many strings the pattern
 * matches: `^(Pros|Cons)$` is not one, however few strings it admits.
 *
 * @param pattern A pattern that already compiles.
 */
export function isAnchoredLiteral(pattern: string): boolean {
  return LITERAL_RUN.test(pattern);
}
