/**
 * The read edge: corpus paths in, their bytes out.
 *
 * One batched read rather than a read per lookup, so the entry point stays a
 * single impure–pure–impure pass instead of a loop that interleaves reads with
 * decisions. Every file is read for the same two reasons and they cannot be
 * separated cheaply: a file may be an ENTRY (its `title`/`name`/`description`
 * are copied), and it may be an `index.md` the region is spliced into. A
 * descriptor may also be neither, when nothing lists it.
 *
 * A file that cannot be read is OMITTED rather than refused, which is the
 * opposite of what `--check` does with a governed file, and the difference is
 * deliberate. `--check` refuses the whole corpus because a report silently
 * missing a file looks complete. Here absence has a defined meaning already:
 * the entry degrades to name-only, exactly as it does for a file that exists
 * and carries no description. Refusing would invent a failure mode for a state
 * the Module already answers.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read every corpus file, skipping the ones that will not open.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param files The corpus, as root-relative paths.
 */
export function readCorpusSources(root: string, files: readonly string[]): Readonly<Record<string, string>> {
  const sources: Record<string, string> = {};

  for (const path of files) {
    try {
      sources[path] = readFileSync(join(root, path), 'utf8');
    } catch {
      // Deliberately silent. See the file docblock: absence already means
      // name-only, so there is nothing new to report.
    }
  }

  return sources;
}
