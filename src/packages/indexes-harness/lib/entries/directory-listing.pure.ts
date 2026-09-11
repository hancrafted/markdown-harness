/**
 * What one declared directory publishes.
 *
 * Two kinds of entry and no third: every markdown file sitting DIRECTLY in the
 * directory, and every DECLARED immediate child directory. One folder level
 * deep, never recursive — under recursion a new file three levels down rewrites
 * every ancestor index, so the top index carries a diff on almost every commit
 * and the diffs stop being read. Depth needs no key of its own: a directory is
 * indexed exactly when it is declared, so the mapping already is the depth lever.
 *
 * One flat list, no headings. The generator writes list items and nothing else,
 * plus at most one disclosure comment. The hand-authored file supplies its own
 * heading above the markers.
 */

import type { DirectoryPath, IndexesConfig } from '../../../config-contract/index.ts';
import { inTreeOrder } from '../../../markdown-file-tree/in-tree-order.ts';
import { descriptorFields } from './descriptor-fields.pure.ts';
import type { DirectoryListing, IndexEntry, ListingContext } from './entries.types.ts';
import { entryLine, entryRefusal } from './entry-line.pure.ts';

/** The repo root's own spelling. `''` would have to be written as a quoted empty key. */
const ROOT = './';

/** The one container the region is ever written into. Hard-wired, and it takes no config key. */
const INDEX_FILE = 'index.md';

/** The Module-wide default when no declared directory names a source. */
const DEFAULT_DESCRIPTION_SOURCE = INDEX_FILE;

/** The extension the corpus is made of, stripped to give a last-resort link text. */
const MARKDOWN_EXTENSION = '.md';

/** What a directory path means as a path prefix: the root prefixes nothing. */
function prefixOf(directory: DirectoryPath): string {
  return directory === ROOT ? '' : directory;
}

/** Where this directory's region is written. */
export function indexPathFor(directory: DirectoryPath): string {
  return `${prefixOf(directory)}${INDEX_FILE}`;
}

/**
 * Every declared directory, in config order.
 *
 * Config order has no consumer — not resolution, because each directory is
 * claimed once by name, and not output, because the list reuses `inTreeOrder`.
 * It is used here only so a report reads down the file the way an Operator
 * would scan it.
 */
export function declaredDirectories(config: IndexesConfig): readonly DirectoryPath[] {
  return Object.keys(config.directories);
}

/**
 * A directory and every ancestor of it, nearest first, ending at the root.
 *
 * PROTOTYPE DECISION, and the one genuinely undecided thing in this file.
 * Issue #92's two worked examples cannot both hold under a single-level rule:
 * `docs/reference/` is described by the `labels.md` IT declares, while
 * `docs/skills/anonymous/` — which declares nothing — is described by the
 * `SKILL.md` its PARENT declares. "Nearest declared value walking up,
 * inclusive" is the only rule reproducing both, and it is what this returns.
 * It is inheritance, and inheritance sits uneasily beside "no implicit
 * definition, I would even say never". Recorded in the findings, not settled.
 */
function ancestorsOf(directory: DirectoryPath): readonly DirectoryPath[] {
  if (directory === ROOT) return [ROOT];
  const segments = directory.slice(0, -1).split('/');
  const chain = segments.map((_segment, index) => `${segments.slice(0, index + 1).join('/')}/`).reverse();
  return [...chain, ROOT];
}

/** Which file a directory's own description is read out of, when a parent lists it. */
function descriptionSourceFor(directory: DirectoryPath, config: IndexesConfig): string {
  for (const ancestor of ancestorsOf(directory)) {
    const declared = config.directories[ancestor]?.descriptionSource;
    if (declared !== undefined) return declared;
  }
  return config.descriptionSource ?? DEFAULT_DESCRIPTION_SOURCE;
}

/** The link text chain: `title`, then `name`, then the file name without `.md`. */
function linkTextFor(fileName: string, text: string | undefined): string {
  const fields = text === undefined ? {} : descriptorFields(text);
  return fields.title ?? fields.name ?? fileName.slice(0, -MARKDOWN_EXTENSION.length);
}

/** Every markdown file sitting directly in this directory, index file included. */
function filesDirectlyIn(directory: DirectoryPath, files: readonly string[]): readonly string[] {
  const prefix = prefixOf(directory);
  return files.filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'));
}

/** Every declared directory that is an immediate child of this one. */
function childrenOf(directory: DirectoryPath, config: IndexesConfig): readonly DirectoryPath[] {
  const prefix = prefixOf(directory);
  return declaredDirectories(config).filter((candidate) => {
    if (candidate === directory || !candidate.startsWith(prefix)) return false;
    return !candidate.slice(prefix.length, -1).includes('/');
  });
}

/** One entry per markdown file sitting directly in this directory. */
function fileEntriesFor(directory: DirectoryPath, context: ListingContext): readonly IndexEntry[] {
  const prefix = prefixOf(directory);
  const excluded = context.config.directories[directory]?.excludeFiles ?? [];
  const own = indexPathFor(directory);

  return filesDirectlyIn(directory, context.files)
    .filter((path) => path !== own && !excluded.some((glob) => context.matches(glob, path)))
    .map((path) => {
      const fileName = path.slice(prefix.length);
      const text = context.sources[path];
      return {
        text: linkTextFor(fileName, text),
        target: fileName,
        description: text === undefined ? undefined : descriptorFields(text).description,
        sortKey: fileName,
      };
    });
}

/** One entry per DECLARED immediate child directory, each linking that child's index. */
function folderEntriesFor(directory: DirectoryPath, context: ListingContext): readonly IndexEntry[] {
  const prefix = prefixOf(directory);

  return childrenOf(directory, context.config).map((child) => {
    const name = child.slice(prefix.length, -1);
    const descriptor = context.sources[`${child}${descriptionSourceFor(child, context.config)}`];
    return {
      text: name,
      target: `${name}/${INDEX_FILE}`,
      description: descriptor === undefined ? undefined : descriptorFields(descriptor).description,
      sortKey: name,
    };
  });
}

/**
 * Everything one declared directory publishes, ordered and rendered.
 *
 * The index being written is never an entry of itself — the one skip OKF's own
 * generator also makes. A file excluded by `excludeFiles` is absent AND
 * disclosed; an undeclared sibling directory is absent and NOT disclosed,
 * because not declaring it is the whole mechanism and publishing its absence
 * would publish precisely what the Operator chose not to.
 *
 * @param directory One declared directory, trailing slash included.
 * @param context The config, the corpus, its bytes, and the glob matcher.
 */
export function directoryListing(directory: DirectoryPath, context: ListingContext): DirectoryListing {
  const excluded = context.config.directories[directory]?.excludeFiles ?? [];
  const found = [...fileEntriesFor(directory, context), ...folderEntriesFor(directory, context)];

  const refused = found.find((entry) => entryRefusal(entry) !== undefined);
  if (refused !== undefined)
    return {
      entries: [],
      disclosed: false,
      refusal: entryRefusal(refused),
      refusedAt: `${prefixOf(directory)}${refused.sortKey}`,
    };

  const byKey = new Map(found.map((entry) => [entry.sortKey, entry]));
  const ordered = inTreeOrder([...byKey.keys()]).map((key) => entryLine(byKey.get(key) as IndexEntry));

  return { entries: ordered, disclosed: excluded.length > 0 };
}
