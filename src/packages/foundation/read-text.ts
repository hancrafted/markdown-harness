// The gate: every byte this tool reads off disk comes through here.
//
// It ANSWERS rather than throws. A read comes back as the file's text, its
// absence, or its unreadability, and what each of those means is the CALLER's
// policy: `--assess` treats absence as ordinary advice about a file an agent is
// about to write, `--check` refuses a whole corpus on it, and the config loader
// maps the two failures onto two different catalog codes. A gate that threw
// would put all three behind one stack trace.
//
// Answers are memoised for the life of the process, failures included, so a
// second Module asking about the same file costs nothing and cannot be told
// something different. `lib/read/read-memo.impure.ts` states what that costs:
// within one process, a file that changes on disk after its first read keeps
// its first answer.
//
// Two shapes, because callers ask two different questions. A corpus file is a
// root plus a root-relative path, and the join is the gate's so no caller does
// path arithmetic of its own. A config file is one location the Operator wrote
// on the command line. The memo normalises either spelling without resolving a
// target; command envelopes still echo the location their caller wrote.

import { hostPathOf } from './lib/platform/node-host.impure.ts';
import type { FileRead } from './lib/read/file-read.types.ts';
import { rememberedRead } from './lib/read/read-memo.impure.ts';

export type { FileRead } from './lib/read/file-read.types.ts';

/**
 * Read one file inside a tree.
 *
 * @param root The tree's root, exactly as the caller wrote it — never resolved.
 * @param path The file, root-relative.
 */
export function readTextIn(root: string, path: string): FileRead {
  return rememberedRead(hostPathOf(root, [path]));
}

/**
 * Read one file named by a single location.
 *
 * @param location The path exactly as the caller wrote it — never resolved.
 */
export function readTextAt(location: string): FileRead {
  return rememberedRead(location);
}
