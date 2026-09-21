/**
 * Which catalog entry a read that produced no bytes earns.
 *
 * Extracted from the loader because it is a rule rather than a step: the
 * catalog draws a line between "no such thing" and "cannot serve it", and that
 * line is a decision this repo makes, not something the filesystem hands back.
 *
 * It maps the GATE's two failures rather than an errno, which it used to. The
 * errno is read once, in `lib/platform/`, so the "only ENOENT proves absence"
 * rule is stated in one place for every caller — and this file is left with the
 * half that is about the CONFIG catalog. Both halves now sit in this Package:
 * the loader was absorbed here once the descriptor removed its one import of a
 * Module.
 */

import type { ConfigFault } from '../../../config-contract/index.ts';
import type { FileRead } from '../read/file-read.types.ts';

/**
 * Turn a read that produced no bytes into the fault it deserves.
 *
 * A DIRECTORY standing where the config should be reaches here as `unreadable`
 * and therefore as `CONFIG_UNREADABLE`, never `CONFIG_NOT_FOUND`: reporting a
 * file missing when something is demonstrably there is the false negative the
 * catalog exists to prevent. The rejected-config tier holds both cases, and
 * they stay two cases because of this line.
 *
 * @param found What the gate answered — anything but bytes.
 * @param location The config path exactly as the caller wrote it — never resolved.
 */
export function faultForUnread(found: Exclude<FileRead, { kind: 'text' }>, location: string): ConfigFault {
  const code = found.kind === 'absent' ? 'CONFIG_NOT_FOUND' : 'CONFIG_UNREADABLE';
  return { code, location };
}
