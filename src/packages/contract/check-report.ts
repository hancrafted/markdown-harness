/**
 * The report format — the other half of the portable artifact (tenet 4).
 *
 * Frozen at `format: 1`. The DATA carries no English: a constraint key plus
 * evidence is a complete basis for every sentence the tool can say, so putting
 * a `message` string beside them would store one fact twice, and two
 * representations of one fact drift. Prose lives only in `core/render.ts`.
 *
 * The line that buys: a change to this data is a CONTRACT change; a change to
 * the wording is a CORPUS change.
 *
 * Author prose is different from harness prose and does appear here — a rule's
 * `intent` is evidence, in the Operator's own words, and quoting it verbatim is
 * the point.
 */

import type { RepoPath } from './corpus.ts';

export interface CheckReport {
  report: 'check';
  /** The report format version. A reader that does not know this number must not guess. */
  format: 1;
  /** Echoed back as the caller passed it — never resolved to an absolute path, so a frozen report travels. */
  root: string;
  /**
   * One entry per governed file WITH A FAULT. A conforming governed file is
   * absent, and an ungoverned file is absent for a different and stronger
   * reason: tenet 6 says it is never reported.
   */
  files: readonly FileReport[];
  totals: CheckTotals;
}

/**
 * Only `governed` is stored, because only `governed` is not derivable.
 *
 * `conforming` is `governed - files.length` and the violation count is the sum
 * over `files`. Both are arithmetic, and arithmetic on a report is the
 * renderer's job — the same reason no `message` field exists. There is
 * deliberately no `invisible` count either: tenet 6 says an ungoverned file is
 * never counted, and a field holding that number would be the report noticing
 * the file.
 */
export interface CheckTotals {
  governed: number;
}

export interface FileReport {
  path: RepoPath;
}
