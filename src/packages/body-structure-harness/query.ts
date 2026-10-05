// What this Module asks of one path, before anything exists there.
//
// Nothing here touches the filesystem, so it cannot know the `type` a file does
// not yet have. It answers every Rule that could win the path, in config order
// — a list of claims rather than one, which the composing
// Package names block by block. `invisible` is not answered here: it is a
// claim about the whole config that only the composing Package can make.

import { isCorpusPath } from '../foundation/corpus-membership.ts';
import { normalisePath } from '../foundation/path-shape.ts';
import type { ModuleClaim } from '../response-contract/index.ts';
import { candidateClaims } from './lib/query/candidates.pure.ts';
import type { BodyStructureConfig } from './section.ts';

/**
 * Every candidate Rule for one path, as claims, in config order.
 *
 * Corpus membership is asked first: a selector carries no extension, so this
 * is what keeps a `.txt` path from being promised a template `--check` will
 * never apply.
 *
 * @param path The path asked about, exactly as the caller wrote it.
 * @param section This Module's validated section, or `undefined` when its key was not written — then it claims nothing.
 */
export function queryPath(path: string, section: BodyStructureConfig | undefined): readonly ModuleClaim[] {
  const normalised = normalisePath(path);
  if (!isCorpusPath(normalised)) return [];
  return candidateClaims(normalised, section?.rules ?? []);
}
