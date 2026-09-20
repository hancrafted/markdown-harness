/**
 * The read edge for one assessed file: a path in, its bytes or its absence out.
 *
 * Reads through the foundation filesystem gate.
 */

import { readFile } from '../../../foundation/read-file.ts';
import type { AssessedFile } from './assess.types.ts';

/**
 * Read the one file an assessment is about.
 *
 * @param root The directory the config's rules are anchored to.
 * @param path The path asked about, root-relative.
 */
export function readAssessedFile(root: string, path: string): AssessedFile {
  const outcome = readFile(root, path);
  if (outcome.kind === 'text') return { kind: 'text', text: outcome.text };
  if (outcome.kind === 'absent') return { kind: 'absent' };
  return { kind: 'unreadable' };
}
