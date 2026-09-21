/**
 * Which of the three states a failed read earns.
 *
 * Extracted from the reader because it is a rule rather than a step: the line
 * between "no such thing" and "cannot serve it" is a decision this repository
 * makes, not something the filesystem hands back. Planting an unreadable file
 * is a permission-dependent setup that says nothing about the rule, so the rule
 * is asserted here without one.
 */

import type { HostRead } from '../platform/node-host.types.ts';
import type { FileRead } from './file-read.types.ts';

/**
 * The one errno that proves absence.
 *
 * Everything else means the entry is there and unusable — a directory, a
 * permission refusal, a broken symlink target, a name too long, a link chain
 * that closes on itself.
 */
const ABSENT = 'ENOENT';

/**
 * Turn what the host said into what the caller is owed.
 *
 * Anything the platform declines to name resolves to `unreadable`, never
 * `absent`: reporting a file missing when it exists is the false negative this
 * distinction exists to prevent, and the two are told apart by evidence rather
 * than by default. A DIRECTORY standing where a file was expected arrives here
 * as `EISDIR` and therefore answers `unreadable` — which is what keeps the
 * rejected-config tier's unreadable case and its not-found case two cases.
 *
 * @param read What the host handed back, errno included.
 */
export function fileReadFor(read: HostRead): FileRead {
  if (read.kind === 'text') return { kind: 'text', text: read.text };
  return read.errorCode === ABSENT ? { kind: 'absent' } : { kind: 'unreadable' };
}
