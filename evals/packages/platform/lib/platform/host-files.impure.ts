// The evals/ platform gate, files half (ARCH-008 §2.2): the only place in this tree
// that imports a filesystem builtin. Every other Package reaches the host here.

import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import type { FileText, TreeEntryRecord } from './host-files.types.ts';

export const readText = (path: string): string => readFileSync(path, 'utf8');
export const pathExists = (path: string): boolean => existsSync(path);
export const systemTemporaryDirectory = (): string => realpathSync(tmpdir());
export const removeTree = (path: string): void => rmSync(path, { recursive: true, force: true });
export const makeDirectory = (path: string): void => void mkdirSync(path, { recursive: true });

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** Copy one file, creating its directory; the content is copied as bytes, never read as text. */
export function copyFile(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

/** Write a file the shell can run: `writeText` plus the executable bits. */
export function writeExecutable(path: string, text: string): void {
  writeText(path, text);
  chmodSync(path, 0o755);
}

/** Copy, never link: a symlink in the source is copied as a symlink, never followed into the destination. */
export function copyTree(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, dereference: false, verbatimSymlinks: true });
}

/** The directories above `path`, nearest first, each with the names it holds. */
export function ancestorListings(path: string): { dir: string; entries: string[] }[] {
  const found: { dir: string; entries: string[] }[] = [];
  for (let dir = dirname(path); ; dir = dirname(dir)) {
    found.push({ dir, entries: readdirSync(dir) });
    if (dirname(dir) === dir) return found;
  }
}

function kindOf(path: string): TreeEntryRecord['kind'] {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return 'symlink';
  return stat.isDirectory() ? 'dir' : 'file';
}

interface Walk {
  readonly root: string;
  readonly skip: readonly string[];
  readonly found: TreeEntryRecord[];
}

function walk(context: Walk, directory: string): void {
  for (const name of readdirSync(directory).sort()) {
    const full = join(directory, name);
    const path = relative(context.root, full).split(sep).join('/');
    if (context.skip.includes(path.split('/')[0] ?? '')) continue;
    const kind = kindOf(full);
    context.found.push({ path, kind });
    if (kind === 'dir') walk(context, full);
  }
}

/** Every entry under `root` without following links; top-level names in `skip` are left out. */
export function walkTree(root: string, skip: readonly string[]): TreeEntryRecord[] {
  const context: Walk = { root, skip, found: [] };
  walk(context, root);
  return context.found;
}

export function readTextFiles(root: string, skip: readonly string[]): FileText[] {
  return walkTree(root, skip)
    .filter((entry) => entry.kind === 'file')
    .map((entry) => ({ path: entry.path, text: readFileSync(join(root, entry.path), 'utf8') }));
}

const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');

export const digestText = (text: string): string => sha256(text);

function entryLine(root: string, entry: TreeEntryRecord): string {
  const full = join(root, entry.path);
  if (entry.kind === 'symlink') return `${entry.path} link ${readlinkSync(full)}`;
  return entry.kind === 'dir' ? `${entry.path} dir` : `${entry.path} file ${sha256(readFileSync(full))}`;
}

/** A digest of a whole tree by content, symlinks hashed by target; top-level names in `skip` are left out. */
export function digestTree(root: string, skip: readonly string[]): string {
  return sha256(
    walkTree(root, skip)
      .map((entry) => entryLine(root, entry))
      .join('\n'),
  );
}

/** A digest of one file by content. */
export const digestFile = (path: string): string => sha256(readFileSync(path));
