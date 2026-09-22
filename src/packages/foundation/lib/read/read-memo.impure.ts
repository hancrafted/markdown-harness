/**
 * Every read this process performs, remembered by the path it was asked about.
 *
 * MEMOISATION IS NOT AN OPTIMISATION HERE. Several Modules ask about the same
 * corpus, and without a shared memo a ten-thousand-file tree costs a multiple
 * of ten thousand reads and parses — one multiple per Module that asks. With
 * it the tree costs ten thousand reads no matter how many Modules ask.
 *
 * FAILURES ARE REMEMBERED TOO, deliberately. A broken path asked about twice
 * would otherwise cost two syscalls and could answer differently each time,
 * and two Modules disagreeing about whether a file is readable is exactly the
 * disagreement one gate exists to make impossible.
 *
 * WITHIN ONE PROCESS, A FILE THAT CHANGES ON DISK AFTER ITS FIRST READ KEEPS
 * ITS FIRST ANSWER — absence included. Every command here runs once and exits,
 * so no invocation outlives the tree it read; a long-lived caller is not a
 * shape this tool has. A test that plants a real tree must therefore plant it
 * under its own unique root, because a second suite writing over the first
 * one's path would be answered from the memo.
 *
 * The store is MODULE-LEVEL rather than handed in. Passing it would make every
 * caller declare a dependency it has no opinion about, and the lifetime that
 * would justify an injected store — a composed process with a registry — is
 * what the registration and composition tickets build. This is deliberately
 * the smaller thing until then.
 */

import { normaliseHostPath, readHostFile } from '../platform/node-host.impure.ts';
import type { FileRead } from './file-read.types.ts';
import { fileReadFor } from './read-outcome.pure.ts';

/** Every answer already given, keyed by its normalised host-path spelling. */
const answered = new Map<string, FileRead>();

/**
 * The text at `location`, its absence, or its unreadability — asked of the
 * host at most once per process.
 *
 * Keyed by the path after syntactic normalisation, never by a resolved target.
 * Normalising collapses equivalent dot-segment spellings, so every Module gets
 * one answer about the same named file; resolving would follow symlinks and
 * make the key a filesystem read.
 *
 * @param location A host path, exactly as the caller assembled it.
 */
export function rememberedRead(location: string): FileRead {
  const normalised = normaliseHostPath(location);
  const remembered = answered.get(normalised);
  if (remembered !== undefined) return remembered;

  const answer = fileReadFor(normalised, readHostFile(normalised));
  answered.set(normalised, answer);
  return answer;
}
