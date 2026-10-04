/**
 * Read the corpus files this Module has to open, or name the first that will
 * not open.
 *
 * The one effect `--check` and `--audit` share. Batched rather than read inside
 * a judging loop, so the whole corpus is refused on one unreadable file rather
 * than reported with that file silently missing — a report that looks complete
 * and is not. The read itself is `foundation`'s gate (ARCH-008 §2.1).
 */

import { readTextIn } from '../../../foundation/read-text.ts';
import type { CorpusRead, CorpusSource } from './corpus-read.types.ts';

/**
 * Read each named file under `root`, in the order given.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param paths Root-relative, normalised paths.
 */
export function readCorpusFiles(root: string, paths: readonly string[]): CorpusRead {
  const sources: CorpusSource[] = [];
  for (const path of paths) {
    const found = readTextIn(root, path);
    if (found.kind !== 'text') return { kind: 'unreadable', path: found.location };
    sources.push({ path, text: found.text });
  }
  return { kind: 'read', sources };
}
