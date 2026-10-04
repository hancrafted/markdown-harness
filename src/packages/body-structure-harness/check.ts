// Every governed file's body-structure violations, across one corpus.
//
// One impure–pure–impure pass. Which files no Rule reaches is decided from the
// paths and those are never opened; every other file is read, because a Rule
// selecting by `type` makes the winner a function of the file's bytes
// (design-ADR 0012); then every verdict is computed over what was read.
//
// Enumeration is NOT here: the corpus arrives as a list of paths, and the
// walker's refusals belong to `foundation`.

import { normalisePath } from '../foundation/path-shape.ts';
import { moduleCheckFor, pathsToRead } from './lib/check/corpus-check.pure.ts';
import { readCorpusFiles } from './lib/read/corpus-read.impure.ts';
import type { CorpusCheck } from './lib/read/corpus-read.types.ts';
import type { BodyStructureConfig } from './section.ts';

export type { CorpusCheck } from './lib/read/corpus-read.types.ts';

/**
 * Check one corpus against this Module's ordered Rule list.
 *
 * Answers THIS MODULE'S HALF of the report — the governed list and the
 * findings — and nothing naming the Module or counting over the corpus; both
 * belong to the composing Package. No verdict when a file it had to open could
 * not be read: the caller owes exit 2.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param files The corpus, as root-relative paths in walker order.
 * @param section This Module's validated section, or `undefined` when its key was not written — then it governs nothing.
 */
export function checkCorpus(
  root: string,
  files: readonly string[],
  section: BodyStructureConfig | undefined,
): CorpusCheck {
  const rules = section?.rules ?? [];
  const read = readCorpusFiles(root, pathsToRead(files.map(normalisePath), rules));
  if (read.kind === 'unreadable') return read;
  return { kind: 'checked', result: moduleCheckFor(read.sources, rules) };
}
