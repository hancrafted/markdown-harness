// The repair seed's scope guards, pure over text and parsed documents. A repair case seeds a file that is wrong on
// purpose: here, a note whose `stale_after` is in the far past so that it is stale at any real clock, which is how
// the assess hook is measured without a pinned instant (D10). Its bytes are the thing under test, so three things
// must hold and each is computed from what the repository says, never from a grep of it: a formatter never reaches
// the seed (a directory-scoped ignore), the repository's own `mh check` never governs it (no governed folder holds
// it), and the stamp stays in the past.

/** A directory entry of an ignore file, trailing slash or double star removed, or undefined for a comment, a blank or a wildcard. */
function directoryEntry(line: string): string | undefined {
  const text = line.trim();
  if (text === '' || text.startsWith('#')) return undefined;
  const directory = text.replace(/\/\*\*$/, '').replace(/\/$/, '');
  return directory === '' || directory.includes('*') ? undefined : directory;
}

function within(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}/`);
}

/** Whether a path sits under a directory-scoped entry of an ignore file's text; a wildcard entry is not directory-scoped. */
export function directoryIgnored(path: string, ignoreText: string): boolean {
  return ignoreText
    .split('\n')
    .flatMap((line) => directoryEntry(line) ?? [])
    .some((directory) => within(path, directory));
}

/** Every `folders` list of strings in an evaluated document, at any depth, in document order. */
export function foldersOf(document: unknown): string[] {
  if (Array.isArray(document)) return document.flatMap(foldersOf);
  if (typeof document !== 'object' || document === null) return [];
  return Object.entries(document).flatMap(([key, value]) => {
    const own =
      key === 'folders' && Array.isArray(value) && value.every((one) => typeof one === 'string')
        ? (value as string[])
        : [];
    return [...own, ...foldersOf(value)];
  });
}

/** Whether a path sits under any folder token a config's rules govern. */
export function governedByFolders(path: string, folders: readonly string[]): boolean {
  return folders.some((folder) => within(path, folder.replace(/\/$/, '')));
}

/** Whether a stamp is strictly before a floor; a stamp that does not parse is not far past. */
export function isFarPast(stamp: string, floor: string): boolean {
  const at = Date.parse(stamp);
  const bound = Date.parse(floor);
  return !Number.isNaN(at) && !Number.isNaN(bound) && at < bound;
}
