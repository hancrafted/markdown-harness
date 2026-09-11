// Every governed file's violations, across one corpus and EVERY Module.
//
// The third Package ARCH-004 predicts: "composing subsystems requires an
// explicit third package that imports across them". Packages are flat and may
// not nest, so the moment a second Module existed, something had to own the
// join — and it could not be either Module, because neither is allowed to know
// the other exists.
//
// The Module ORDER is declared here, once, and it is the order
// `MarkdownHarnessConfig` declares its keys in. Reading it off the parsed YAML
// instead would make two adopters' reports differ for no reason but the order
// they happened to type their config.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { checkNames } from '../file-names-harness/check.ts';
import { checkFrontmatterCorpus } from '../frontmatter-harness/check.ts';
import { checkResultFrom } from './lib/verdict/module-merge.pure.ts';
import type { CorpusCheck } from './lib/verdict/verdict.types.ts';

/**
 * Check one corpus against every Module the config declares.
 *
 * The frontmatter Module runs FIRST and its refusal short-circuits, which is
 * deliberate: it is the only Module that opens a file, so it is the only one
 * that can discover the corpus is unreadable. Running the naming Module first
 * would compute a set of findings about a corpus that is about to be refused —
 * wasted, and worse, it would tempt a later edit into reporting them.
 *
 * A file governed by neither Module never appears, and is not counted. A file
 * governed by one and clean in it is counted and does not appear. Only a file
 * with at least one finding in at least one Module appears in `files`.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param files The corpus, as root-relative paths in walker order.
 * @param config A config that has already been validated.
 */
export function checkCorpus(root: string, files: readonly string[], config: MarkdownHarnessConfig): CorpusCheck {
  const frontmatter = checkFrontmatterCorpus(root, files, config);
  if (frontmatter.kind === 'unreadable') return frontmatter;

  const names = checkNames(files, config);

  return { kind: 'checked', result: checkResultFrom(files, [...frontmatter.outcomes, ...names]) };
}

export type { CorpusCheck, UnreadableCorpusFile } from './lib/verdict/verdict.types.ts';
