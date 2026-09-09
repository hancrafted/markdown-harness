/**
 * The seams inside `--assess`.
 *
 * Two shapes, each naming one thing the stage before it could not decide. What
 * sits at a path is the filesystem's answer; whether the bytes make a freshness
 * claim is a reading of them. Keeping the two apart is what lets an absent file
 * and an unreadable one earn opposite advice — one is a file an agent may be
 * about to write, the other a repair someone owes.
 */

import type { AssessEvidence } from '../../../response-contract/index.ts';

/** What sits at the path, as far as the filesystem is concerned. */
export type AssessedFile =
  /** The bytes. */
  | { kind: 'text'; text: string }
  /** Nothing is there. An ordinary answer, not a failure. */
  | { kind: 'absent' }
  /** Something is there and cannot be read: a directory, or permissions. */
  | { kind: 'unreadable' };

/** How the file answered, when it could answer at all. */
export type Freshness =
  /** The claim ran out at or before the instant. */
  | { state: 'stale'; evidence: AssessEvidence }
  /** The claim still holds. */
  | { state: 'fresh'; evidence: AssessEvidence }
  /** The file made no freshness claim this could read. */
  | { state: 'unassessable' };
