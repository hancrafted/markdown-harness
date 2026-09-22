/**
 * The literal token grammar selectors and paths share.
 *
 * A selector names only literal folders and basenames. The validator asks
 * whether config text is a token, while the matcher decomposes a normalised
 * corpus path into those same tokens; publishing both operations together
 * makes a validated token reachable by construction.
 */

/** The separator every normalised path and folder token uses. */
const SEPARATOR = '/';

/** The corpus root's only writable folder token. */
const ROOT_FOLDER = './';

/**
 * Glob syntax refused from literal selector tokens.
 *
 * These are the syntax characters an Operator is likely to paste from a glob.
 * Other punctuation remains legal because it can be part of a filesystem name.
 */
const REFUSED_GLOB_CHARACTERS: readonly string[] = ['*', '?', '[', ']', '{', '}'];

function carriesWildcard(token: string): boolean {
  return REFUSED_GLOB_CHARACTERS.some((character) => token.includes(character));
}

/**
 * Whether one token names a literal folder.
 *
 * The root token is `./`; no other dot segment is a folder name. Paths passed
 * to selector matching are normalised before this grammar sees them, so
 * accepting `./docs/` would validate a token no emitted folder can equal.
 *
 * @param token A folder token written in configuration.
 */
export function isFolderToken(token: string): boolean {
  if (carriesWildcard(token)) return false;
  if (token === ROOT_FOLDER) return true;
  if (!token.endsWith(SEPARATOR) || token.startsWith(SEPARATOR)) return false;

  return token
    .slice(0, -SEPARATOR.length)
    .split(SEPARATOR)
    .every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

/**
 * Whether one token names a literal file basename.
 *
 * @param token A file-name token written in configuration.
 */
export function isFileNameToken(token: string): boolean {
  return token !== '' && token !== '.' && token !== '..' && !token.includes(SEPARATOR) && !carriesWildcard(token);
}

/**
 * The folder token a normalised path sits in.
 *
 * @param path A normalised, repo-root-relative path.
 */
export function folderOf(path: string): string {
  const lastSeparator = path.lastIndexOf(SEPARATOR);
  return lastSeparator === -1 ? ROOT_FOLDER : path.slice(0, lastSeparator + 1);
}

/**
 * The basename a normalised path ends in.
 *
 * @param path A normalised, repo-root-relative path.
 */
export function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf(SEPARATOR) + 1);
}
