// The two path questions a caller may not answer for itself.
//
// Both read the host. The separator differs across platforms, and a module's
// own location is something only the module runtime knows — neither arrives as
// an argument, so assembling either at a call site is a caller reaching past
// the gate for an ambient value. Published here so that no Package outside
// this one has to import `node:path` or `node:url` to address a file.
//
// Neither of these READS the filesystem. They are here because they are
// platform reads, which is the thing ARCH-008 §2.1 puts behind one Package —
// not because they are filesystem reads, which they are not.

import { directoryOfModule, hostPathOf } from './lib/platform/node-host.impure.ts';

/**
 * Join a root and the segments below it into one host path.
 *
 * Prefer handing a root and a root-relative path to `readTextIn` over calling
 * this: a caller that never assembles a path cannot assemble a wrong one. This
 * is for the cases where the joined string is itself the answer — a refusal
 * naming the path a read was attempted at, or a root handed to a walk.
 *
 * @param root The directory the segments are relative to.
 * @param segments Path segments below it, in order.
 */
export function hostPath(root: string, ...segments: readonly string[]): string {
  return hostPathOf(root, segments);
}

/**
 * The directory the calling module sits in.
 *
 * Pass `import.meta.url` and nothing else. It is the only address a module has
 * for itself that survives both a working directory it was not started from and
 * a compile into `dist/`.
 *
 * @param moduleUrl The calling module's own `import.meta.url`.
 */
export function directoryOf(moduleUrl: string): string {
  return directoryOfModule(moduleUrl);
}
