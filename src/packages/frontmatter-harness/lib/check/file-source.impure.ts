/**
 * The read edge: governed paths in, their bytes out.
 *
 * The only file `--check` opens anything with. It decides nothing — which rule
 * won is already settled, and what the bytes mean is `file-verdict.pure`'s job
 * — so this reads, catches, and hands the whole batch back at once. Taking the
 * list rather than one path is what keeps the entry point a single
 * impure–pure–impure pass instead of a loop that interleaves reads with
 * judgement.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GovernedFile, GovernedRead, GovernedSource } from './check.types.ts';

/**
 * Read every governed file, or refuse the whole batch and name the first refusal.
 *
 * Refuses on ANY failure, at any path. A governed file the walker enumerated
 * and this cannot open is a file the report would have to be silent about, and
 * a partial report that looks complete is the one failure a trust tool cannot
 * have — the same judgement the walker already makes about a directory it
 * cannot read. The caller turns it into exit 2, "could not report at all".
 *
 * The FIRST refusal only. Reading on to collect every unopenable path would
 * name more files at the cost of a report that is refused either way, and one
 * path is already enough for the Operator to act — the batch stops where a
 * complete answer became impossible.
 *
 * The platform's own message is still dropped, and now that costs nothing: it
 * says `EACCES` where the path says which file, and the path is the half a
 * caller cannot reconstruct.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param governed Every governed path, paired with the rule that won it.
 */
export function readGovernedSources(root: string, governed: readonly GovernedFile[]): GovernedRead {
  const sources: GovernedSource[] = [];

  for (const file of governed) {
    const at = join(root, file.path);
    let text: string;
    try {
      text = readFileSync(at, 'utf8');
    } catch {
      return { kind: 'unreadable', path: at };
    }
    sources.push({ path: file.path, rule: file.rule, text });
  }

  return { kind: 'read', sources };
}
