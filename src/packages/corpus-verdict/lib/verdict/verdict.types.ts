/**
 * What composing every Module's answer produces.
 *
 * The refusal is restated here rather than imported from a Module, because it
 * is the COMPOSER's refusal once it crosses this boundary: a caller of
 * `checkCorpus` is owed "a governed file could not be read" without having to
 * know which Module could not read it. Only one Module opens files today, and
 * that is an implementation fact the response must not depend on.
 */

import type { CheckResult } from '../../../response-contract/index.ts';

/**
 * The first governed path that would not open, exactly as read was attempted.
 *
 * Only the FIRST. Collecting every unopenable path would name more files at the
 * cost of a report that is refused either way, and one path is already enough
 * to act on.
 */
export interface UnreadableCorpusFile {
  /** The discriminant. */
  kind: 'unreadable';
  /** The path read was attempted at — the corpus root as written, joined with the file's own. */
  path: string;
}

/**
 * The outcome of checking one corpus across every Module.
 *
 * No verdict when a governed file could not be read: the caller owes exit 2 for
 * it, because a report that quietly omitted the file would look complete.
 */
export type CorpusCheck =
  /** Every governed file judged by every Module that claims it. */
  { kind: 'checked'; result: CheckResult } | UnreadableCorpusFile;
