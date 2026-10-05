/**
 * The one regex dialect of the config file: ECMAScript with the `u` flag and no
 * other, searched and never anchored.
 *
 * Every `pattern` in the config is read in it, in every Module, at load and at
 * check alike. Built here, once, because no Module may import another
 * (ARCH-008): two Modules each spelling `new RegExp(pattern, 'u')` is how
 * `\p{Lu}` came to mean two things in one config, and how a flag dropped on one
 * side would read a pattern in a second dialect at check time after load
 * validated it in the first.
 */

/**
 * A pattern as a `RegExp` in the dialect. Validation asks whether it compiles;
 * matching searches with it.
 *
 * @param pattern The pattern as the Operator wrote it; throws when the engine refuses it.
 */
export function dialectPattern(pattern: string): RegExp {
  return new RegExp(pattern, 'u');
}

/**
 * Whether a string compiles in the dialect. A pattern the engine refuses could
 * never fire, and `^Source\-` is one: an unnecessary escape is a syntax error
 * under `u`.
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
