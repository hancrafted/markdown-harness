/**
 * The read edge: governed paths in, their bytes out.
 *
 * It decides nothing — which rule won is already settled, and what the bytes
 * mean is `file-verdict.pure`'s job — so this asks the gate, and hands the
 * whole batch back at once. Taking the list rather than one path is what keeps
 * the entry point a single impure–pure–impure pass instead of a loop that
 * interleaves reads with judgement.
 *
 * The bytes come from `foundation`, which memoises them, so a corpus this
 * command has already read costs one map lookup per file here rather than a
 * second pass over the tree.
 */

import { hostPath } from '../../../foundation/host-path.ts';
import { readTextIn } from '../../../foundation/read-text.ts';
import type { GovernedFile, GovernedRead, GovernedSource } from './check.types.ts';

/**
 * Read every governed file, or refuse the whole batch and name the first refusal.
 *
 * Refuses on ANY answer but bytes, at any path — absence included. A governed
 * file the walker enumerated and this cannot open is a file the report would
 * have to be silent about, and a partial report that looks complete is the one
 * failure a trust tool cannot have. It is the same judgement the walker already
 * makes about a directory it cannot read. The caller turns it into exit 2,
 * "could not report at all".
 *
 * The FIRST refusal only. Reading on to collect every unopenable path would
 * name more files at the cost of a report that is refused either way, and one
 * path is already enough for the Operator to act — the batch stops where a
 * complete answer became impossible.
 *
 * The path comes back joined, because that is the half a caller cannot
 * reconstruct: the platform's own message would say `EACCES` where the path
 * says which file.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param governed Every governed path, paired with the rule that won it.
 */
export function readGovernedSources(root: string, governed: readonly GovernedFile[]): GovernedRead {
  const sources: GovernedSource[] = [];

  for (const file of governed) {
    const found = readTextIn(root, file.path);
    if (found.kind !== 'text') return { kind: 'unreadable', path: hostPath(root, file.path) };
    sources.push({ path: file.path, rule: file.rule, text: found.text });
  }

  return { kind: 'read', sources };
}
