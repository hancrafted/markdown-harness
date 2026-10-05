// How every Rule fared across one corpus, over all three axes.
//
// Unlike the first Module's, this audit opens files: whether a Rule writing
// `types` selected a file depends on its `type`. It opens
// every file `check` opens, plus any a typed Rule excludes, and one that will
// not open refuses the whole audit rather than leaving a row quietly short.

import { normalisePath } from '../foundation/path-shape.ts';
import { readCorpus } from '../foundation/read-corpus.ts';
import type { CorpusAudit } from './lib/audit/corpus-audit.types.ts';
import { tallyRules } from './lib/audit/rule-tally.pure.ts';
import { documentTypeOf } from './lib/document/document-type.pure.ts';
import { pathsToAudit } from './lib/rules/body-rules.pure.ts';
import type { BodyStructureConfig } from './section.ts';

export type { CorpusAudit } from './lib/audit/corpus-audit.types.ts';

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
  const read = readCorpus(root, pathsToAudit(paths, rules));
  if (read.kind === 'unreadable') return read;

  const types = new Map(read.documents.map((document) => [document.path, documentTypeOf(document.frontmatter)]));
  return {
    rules: tallyRules(
      paths.map((path) => ({ path, type: types.get(path) })),
      rules,
    ),
  };
}
