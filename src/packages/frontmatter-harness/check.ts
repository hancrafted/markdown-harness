/**
 * Check one corpus against the frontmatter module's ordered rule list.
 */

import { checkResultFor } from './lib/check/check-result.pure.ts';
import type { CorpusCheck } from './lib/check/check.types.ts';
import { governedFiles } from './lib/check/corpus-governance.pure.ts';
import { readGovernedSources } from './lib/check/file-source.impure.ts';
import { normalisePath } from './lib/rules/path-shape.pure.ts';
import type { FrontmatterConfig } from './section.types.ts';

/**
 * Check one corpus against the frontmatter module's ordered rule list.
 *
 * @param root The corpus directory exactly as the caller wrote it.
 * @param files The corpus, as root-relative paths in walker order.
 * @param section A frontmatter section that has already been validated, or undefined.
 */
export function checkCorpus(
  root: string,
  files: readonly string[],
  section: FrontmatterConfig | undefined,
): CorpusCheck {
  const rules = section?.rules ?? [];
  const governed = governedFiles(files.map(normalisePath), rules);

  const read = readGovernedSources(root, governed);
  if (read.kind === 'unreadable') return read;

  return { kind: 'checked', result: checkResultFor(read.sources) };
}
