// The two directory reads the enrolment check is derived from.
//
// AMBIENT READ: the filesystem, through `node:fs`. Nothing here decides
// anything — it gathers names, sorted, and hands them to the pure pairing in
// `tier-name.pure.ts`.
//
// Neither function catches. A fixture root or a tests folder that cannot be
// read is a broken suite, and an empty list returned in its place would make
// the enrolment check pass over nothing — the one failure it exists to prevent
// on the other side of the comparison.

import { readdirSync } from 'node:fs';

/** Every immediate subdirectory of `dir`, by name, sorted. */
export function directoriesIn(dir: string): readonly string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Every immediate file of `dir`, by name, sorted. */
export function fileNamesIn(dir: string): readonly string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}
