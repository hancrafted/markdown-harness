// Every governed file's violations, across one corpus.
//
// The only command that opens a file. It runs as one impure–pure–impure pass
// rather than a loop: governance is decided for the whole corpus first, then
// every governed file is read, then every verdict is computed. Reading inside
// the judging loop would work identically and would put an effect between two
// computations that could each sit on one side of it — and it is the batched
// shape that lets `readGovernedSources` refuse the whole corpus rather than
// leave one file silently unreported.
//
// Enumeration is NOT here. The corpus arrives as a list of paths, because the
// walker's refusals belong to `foundation` and keeping them out of this
// file is what lets them be proven before frontmatter parsing can confuse a
// failure.

import { normalisePath } from '../foundation/path-shape.ts';
import { readTextIn } from '../foundation/read-text.ts';
import { moduleCheckFor } from './lib/check/check-result.pure.ts';
import type { CorpusCheck, GovernedRead, GovernedSource } from './lib/check/check.types.ts';
import { governedFiles } from './lib/check/corpus-governance.pure.ts';
import type { FrontmatterConfig } from './section.ts';

export type { CorpusCheck, UnreadableGovernedFile } from './lib/check/check.types.ts';

/**
 * Read each governed file, or preserve the first refusal from the gate.
 *
 * `--assess` reaches the same gate directly at its entry point. Keeping this
 * batch here gives both commands one Module-to-gate hop and leaves the gate as
 * the only code that joins a host path.
 */
function readGovernedSources(root: string, governed: ReturnType<typeof governedFiles>): GovernedRead {
  const sources: GovernedSource[] = [];

  for (const file of governed) {
    const found = readTextIn(root, file.path);
    if (found.kind !== 'text') return { kind: 'unreadable', path: found.location };
    sources.push({ path: file.path, rule: file.rule, text: found.text });
  }

  return { kind: 'read', sources };
}

/**
 * Check one corpus against this Module's ordered rule list.
 *
 * Takes THIS MODULE'S SECTION rather than the whole config, and no longer
 * reaches for its own key inside one.
 *
 * Answers with THIS MODULE'S HALF of the report rather than the report: the
 * extent it governed and the findings it made, with nothing naming the Module
 * and no counts over the corpus. Both belong to the composing Package, which is
 * the only one that can see every Module — and `governedFiles` is a union
 * across them rather than any one Module's tally.
 *
 * No verdict when a governed file could not be read — the caller owes exit 2
 * for it, because a report that quietly omitted the file would look complete.
 * The path comes back with the refusal so the caller can say which file, which
 * is the only part of that sentence the caller cannot work out for itself.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param files The corpus, as root-relative paths in walker order.
 * @param section This Module's validated section, or `undefined` when its key was not written — a Module governing nothing governs no file here either.
 */
export function checkCorpus(
  root: string,
  files: readonly string[],
  section: FrontmatterConfig | undefined,
): CorpusCheck {
  const governed = governedFiles(files.map(normalisePath), section?.rules ?? []);

  const read = readGovernedSources(root, governed);
  if (read.kind === 'unreadable') return read;

  return { kind: 'checked', result: moduleCheckFor(read.sources) };
}
