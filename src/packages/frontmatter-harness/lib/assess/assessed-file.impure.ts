/**
 * The read edge for one assessed file: a path in, its bytes or its absence out.
 *
 * Separate from `--check`'s read edge because the two want opposite things from
 * a missing file. `--check` walks a corpus the walker already enumerated, so a
 * file it cannot open is a hole in a report that would look complete, and it
 * refuses the whole batch. `--assess` is handed ONE path by a caller who may be
 * about to create it, so absence is an ordinary answer here rather than a
 * failure — the same reading that lets `--query` answer about a path that does
 * not exist.
 *
 * It decides nothing else. Whether the bytes make a freshness claim is
 * `freshness.pure`'s job.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AssessedFile } from './assess.types.ts';

/** The platform's code for "nothing at that path", the one failure that is not an error here. */
const NOT_FOUND = 'ENOENT';

/**
 * Read the one file an assessment is about.
 *
 * `unreadable` is kept apart from `absent` because they earn different answers:
 * a path with nothing at it is a file an agent may be about to write, while a
 * path holding something unreadable is a file that exists and cannot state its
 * freshness — which is the `unassessable` finding, and a repair someone owes.
 * Collapsing the two would tell an agent to proceed against a file that is
 * really there.
 *
 * `unreadable` is UNCOVERED BY TEST, deliberately and not by oversight. Its
 * only reachable causes are a file with no read permission and a directory
 * named `*.md`, and neither is committable as a fixture — a directory whose
 * name has no `.md` never reaches here at all, because every glob names `*.md`
 * and governance is decided before the read. The branch stays because a
 * permissions failure must not crash the process. See the assess integration
 * suite, which states the same measurement.
 *
 * @param root The directory the config's globs are anchored to, exactly as the caller wrote it.
 * @param path The path asked about, root-relative.
 */
export function readAssessedFile(root: string, path: string): AssessedFile {
  try {
    return { kind: 'text', text: readFileSync(join(root, path), 'utf8') };
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code === NOT_FOUND ? { kind: 'absent' } : { kind: 'unreadable' };
  }
}
