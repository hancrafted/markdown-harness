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
import type { GovernedFile, GovernedSource } from './check.types.ts';

/**
 * Read every governed file, or refuse the whole batch.
 *
 * `undefined` on ANY failure, at any path. A governed file the walker
 * enumerated and this cannot open is a file the report would have to be silent
 * about, and a partial report that looks complete is the one failure a trust
 * tool cannot have — the same judgement the walker already makes about a
 * directory it cannot read. The caller turns it into exit 2, "could not report
 * all".
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param governed Every governed path, paired with the rule that won it.
 */
export function readGovernedSources(
  root: string,
  governed: readonly GovernedFile[],
): readonly GovernedSource[] | undefined {
  const sources: GovernedSource[] = [];

  for (const file of governed) {
    let text: string;
    try {
      text = readFileSync(join(root, file.path), 'utf8');
    } catch {
      // The platform's message is deliberately dropped: stderr carries the usage
      // text and nothing else, so there is nowhere for it to go.
      return undefined;
    }
    sources.push({ path: file.path, rule: file.rule, text });
  }

  return sources;
}
