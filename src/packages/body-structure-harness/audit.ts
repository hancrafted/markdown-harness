// How every Rule fared across one corpus, over all three axes.
//
// Unlike the first Module's, this audit opens files: whether a Rule writing
// `types` selected a file depends on its `type` (design-ADR 0015). It opens
// every file `--check` opens, plus any a typed Rule excludes, and one that will
// not open refuses the whole audit rather than leaving a row quietly short.

import { normalisePath } from '../foundation/path-shape.ts';
import { candidatePaths, tallyRules } from './lib/audit/rule-tally.pure.ts';
import { documentPartsOf } from './lib/document/document-parts.pure.ts';
import { readCorpusFiles } from './lib/read/corpus-read.impure.ts';
import type { CorpusAudit } from './lib/read/corpus-read.types.ts';
import type { BodyStructureConfig } from './section.ts';

export type { CorpusAudit } from './lib/read/corpus-read.types.ts';

/**
 * Tally this Module's ordered Rule list across a corpus.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param files The corpus, as root-relative paths in walker order.
 * @param section This Module's validated section, or `undefined` when its key was not written — then it tallies nothing.
 */
export function auditRules(
  root: string,
  files: readonly string[],
  section: BodyStructureConfig | undefined,
): CorpusAudit {
  const rules = section?.rules ?? [];
  const paths = files.map(normalisePath);
  const read = readCorpusFiles(root, candidatePaths(paths, rules));
  if (read.kind === 'unreadable') return read;

  const types = new Map(read.sources.map((source) => [source.path, documentPartsOf(source.text).type]));
  return {
    rules: tallyRules(
      paths.map((path) => ({ path, type: types.get(path) })),
      rules,
    ),
  };
}
