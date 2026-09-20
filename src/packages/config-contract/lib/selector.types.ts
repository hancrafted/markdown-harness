/**
 * The literal selector language: three literal keys, and admits no wildcard.
 *
 * Folders carry a mandatory trailing slash (`/`), and the corpus root is `./`.
 * File names are literal basenames with extension, compared case-sensitively.
 * Absent axis means every.
 */

export type FolderPath = string;
export type FileName = string;

export interface Selector {
  /** That folder alone (repo-root-relative, mandatory trailing `/`). */
  folders?: readonly FolderPath[];
  /** That folder and every folder below it (repo-root-relative, mandatory trailing `/`). */
  folderTrees?: readonly FolderPath[];
  /** Literal basenames, extension included. */
  fileNames?: readonly FileName[];
}
