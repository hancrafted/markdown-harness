/**
 * The platform filesystem gate, and the only file in the production build that reaches it.
 *
 * All platform filesystem operations — memoised reading, tree walking with symlink
 * containment and loop detection — sit here behind the gate.
 */

import { readdirSync, readFileSync, realpathSync, statSync, type Dirent } from 'node:fs';
import { basename, join } from 'node:path';
import { actionFor } from '../tree/corpus-entry.pure.ts';
import { childPath, inTreeOrder } from '../tree/tree-path.pure.ts';
import type { ReadOutcome } from './file-system.types.ts';

const readCache = new Map<string, ReadOutcome>();

/** Reset the memoised read cache (used between runs and in tests). */
export function resetReadCache(): void {
  readCache.clear();
}

/**
 * Read one file, memoised.
 *
 * Answers a tri-state: `text`, `absent`, or `unreadable`. It never throws.
 * Failures are cached as well as successes.
 *
 * @param location Path to read, or root directory if `relativePath` is provided.
 * @param relativePath Optional root-relative path.
 */
export function readFile(location: string, relativePath?: string): ReadOutcome {
  const target = relativePath === undefined ? location : join(location, relativePath);
  const cached = readCache.get(target);
  if (cached !== undefined) return cached;

  let outcome: ReadOutcome;
  try {
    const text = readFileSync(target, 'utf8');
    outcome = { kind: 'text', text };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    outcome = code === 'ENOENT' ? { kind: 'absent' } : { kind: 'unreadable' };
  }

  readCache.set(target, outcome);
  return outcome;
}

/** One directory's entries, or 'eloop' / 'unreadable'. */
function readDirectoryEntries(directory: string): readonly Dirent[] | 'eloop' | 'unreadable' {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    return code === 'ELOOP' ? 'eloop' : 'unreadable';
  }
}

interface WalkScope {
  resolvedRoot: string;
  resolvedRootWithSlash: string;
  into: string[];
}

interface Cursor {
  absolute: string;
  relative: string;
}

function resolveSymlinkTarget(childAbsolute: string): string | 'eloop' | 'missing' {
  try {
    return realpathSync(childAbsolute);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    return code === 'ELOOP' ? 'eloop' : 'missing';
  }
}

function collectSymlinkTarget(target: string, candidateRel: string, into: string[]): boolean {
  try {
    const targetStat = statSync(target);
    if (targetStat.isFile() && actionFor('file', basename(candidateRel)) === 'collect') {
      into.push(candidateRel);
    }
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    return code !== 'ELOOP';
  }
}

function handleSymlink(childAbsolute: string, candidateRel: string, scope: WalkScope): boolean {
  const target = resolveSymlinkTarget(childAbsolute);
  if (target === 'eloop') return false;
  if (target === 'missing') return true;

  const isContained = target === scope.resolvedRoot || target.startsWith(scope.resolvedRootWithSlash);
  if (!isContained) return false;

  return collectSymlinkTarget(target, candidateRel, scope.into);
}

function processEntry(entry: Dirent, cursor: Cursor, scope: WalkScope): boolean {
  const childAbsolute = join(cursor.absolute, entry.name);
  const relChild = childPath(cursor.relative, entry.name);

  if (entry.isSymbolicLink()) {
    return handleSymlink(childAbsolute, relChild, scope);
  }

  if (entry.isDirectory()) {
    if (actionFor('directory', entry.name) !== 'descend') return true;
    return collectInto({ absolute: childAbsolute, relative: relChild }, scope);
  }

  if (entry.isFile() && actionFor('file', entry.name) === 'collect') {
    scope.into.push(relChild);
  }

  return true;
}

function collectInto(cursor: Cursor, scope: WalkScope): boolean {
  const entries = readDirectoryEntries(cursor.absolute);
  if (entries === 'eloop' || entries === 'unreadable') return false;

  for (const entry of entries) {
    const ok = processEntry(entry, cursor, scope);
    if (!ok) return false;
  }

  return true;
}

/**
 * Every corpus member under `root`, sorted lexicographically.
 *
 * Answers `undefined` on any refusal: root does not exist, root is not a directory,
 * a symlink escapes the corpus root, a symlink cycle is encountered, or a directory
 * cannot be opened.
 */
export function walkTree(root: string): readonly string[] | undefined {
  let resolvedRoot: string;
  try {
    resolvedRoot = realpathSync(root);
    const rootStat = statSync(root);
    if (!rootStat.isDirectory()) return undefined;
  } catch {
    return undefined;
  }

  const resolvedRootWithSlash = resolvedRoot.endsWith('/') ? resolvedRoot : `${resolvedRoot}/`;
  const found: string[] = [];
  const scope: WalkScope = { resolvedRoot, resolvedRootWithSlash, into: found };
  const read = collectInto({ absolute: root, relative: '' }, scope);
  return read ? inTreeOrder(found) : undefined;
}
