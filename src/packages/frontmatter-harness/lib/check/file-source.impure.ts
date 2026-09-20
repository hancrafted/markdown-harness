/**
 * The read edge: governed paths in, their bytes out.
 *
 * Reads through the foundation filesystem gate.
 */

import { readFile } from '../../../foundation/read-file.ts';
import type { GovernedFile, GovernedRead, GovernedSource } from './check.types.ts';

/**
 * Read every governed file, or refuse the whole batch and name the first refusal.
 *
 * @param root The corpus directory exactly as the caller wrote it.
 * @param governed Every governed path, paired with the rule that won it.
 */
export function readGovernedSources(root: string, governed: readonly GovernedFile[]): GovernedRead {
  const sources: GovernedSource[] = [];

  for (const file of governed) {
    const outcome = readFile(root, file.path);
    if (outcome.kind !== 'text') {
      const at = root === '' ? file.path : `${root}/${file.path}`;
      return { kind: 'unreadable', path: at };
    }
    sources.push({ path: file.path, rule: file.rule, text: outcome.text });
  }

  return { kind: 'read', sources };
}
