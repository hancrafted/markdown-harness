// Run one JavaScript entry as a child of this same Node binary.
//
// The process boundary, reached through the platform gate like every read. Its
// one caller today is the Conformance suite, which judges `mh` at that boundary
// — the compiled artefact an adopter runs — rather than through a Module's own
// files. It ANSWERS rather than throws: a child that could not start comes back
// with no exit code and the reason on `stderr`, and what that means is the
// caller's policy.

import { runHostEntry } from './lib/platform/node-host.impure.ts';
import type { HostRun } from './lib/platform/node-host.types.ts';

export type { HostRun } from './lib/platform/node-host.types.ts';

/**
 * Run `entry` with `args`, starting in `cwd`.
 *
 * @param entry The script to run, as a host path.
 * @param args The arguments after it.
 * @param cwd The working directory the child starts in.
 */
export function runEntry(entry: string, args: readonly string[], cwd: string): HostRun {
  return runHostEntry(entry, args, cwd);
}
