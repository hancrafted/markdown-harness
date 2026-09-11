// Every governed file's frontmatter violations, across one corpus.
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
// walker's refusals belong to `markdown-file-tree` and keeping them out of this
// file is what lets them be proven before frontmatter parsing can confuse a
// failure.
//
// COMPOSITION is not here either. This answers for the `frontmatter` Module and
// nothing else; merging its answer with another Module's, and counting the
// union, is `corpus-verdict`'s job. A Module that assembled the whole report
// would have to name a Module it is forbidden to know about.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { normalisePath } from '../markdown-file-tree/normalise-path.ts';
import { frontmatterOutcomes } from './lib/check/check-result.pure.ts';
import type { FrontmatterCorpusCheck } from './lib/check/check.types.ts';
import { governedFiles } from './lib/check/corpus-governance.pure.ts';
import { readGovernedSources } from './lib/check/file-source.impure.ts';
import { matchGlob } from './lib/rules/glob-match.impure.ts';

/**
 * Check one corpus against this Module's ordered rule list.
 *
 * No verdict when a governed file could not be read — the caller owes exit 2
 * for it, because a report that quietly omitted the file would look complete.
 * The path comes back with the refusal so the caller can say which file, which
 * is the only part of that sentence the caller cannot work out for itself.
 *
 * One outcome per GOVERNED file, conforming ones included. The caller needs
 * them: a clean governed file is absent from the report and present in
 * `governedFiles`, and only the caller can tell the two apart.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param files The corpus, as root-relative paths in walker order.
 * @param config A config that has already been validated.
 */
export function checkFrontmatterCorpus(
  root: string,
  files: readonly string[],
  config: MarkdownHarnessConfig,
): FrontmatterCorpusCheck {
  const governed = governedFiles(files.map(normalisePath), config.frontmatter?.rules ?? [], matchGlob);

  const read = readGovernedSources(root, governed);
  if (read.kind === 'unreadable') return read;

  return { kind: 'checked', outcomes: frontmatterOutcomes(read.sources) };
}
