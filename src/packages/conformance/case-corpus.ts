// Where the Conformance corpus is and what a tier of it holds.
//
// `fixtures/conformance/` is NOT a corpus root. It holds tiers, one directory
// each, and a TIER root is the synthetic repo root a runner points at: the
// `frontmatter` tier holds its own `valid-test-config.yaml`, whose selectors
// are written relative to that directory.
//
// This Package is not a Module. A Module is a named checking domain that owns a
// top-level config section, and membership is decided by the declared Module
// set rather than by where a folder sits — so nothing about `conformance/`
// living beside `frontmatter-harness/` under `src/packages/` makes it one, and
// no naming convention has to carry the distinction.

import { fileURLToPath } from 'node:url';
import { listMarkdownFiles } from '../markdown-file-tree/list-markdown-files.ts';
import { directoriesIn } from './lib/tier/tier-tree.impure.ts';

/**
 * The directory holding every tier, as a URL so that `new URL` resolution does
 * the joining. The trailing slash is load-bearing: without it the last segment
 * is replaced rather than descended into.
 */
const TIERS = new URL('../../../fixtures/conformance/', import.meta.url);

/** The directory holding every tier. Not a corpus — see the note above. */
export function conformanceRoot(): string {
  return fileURLToPath(TIERS);
}

/** One tier's root: the synthetic repo root its runner checks against. */
export function tierRoot(tier: string): string {
  return fileURLToPath(new URL(`${tier}/`, TIERS));
}

/**
 * Every Conformance case in `tier`, tier-relative and in tree order.
 *
 * Throws rather than answering `[]` when the tier cannot be read. An empty
 * corpus and an unreadable one produce the same green suite otherwise, and the
 * declared case count each runner states is the other half of that guard.
 */
export function casesIn(tier: string): readonly string[] {
  const root = tierRoot(tier);
  const found = listMarkdownFiles(root);
  if (found === undefined) throw new Error(`the ${tier} tier has no readable directory at ${root}`);
  return found;
}

/**
 * Every case DIRECTORY in `tier`, by name, sorted.
 *
 * A rejected-config case is a directory rather than a document: config bytes
 * under the adopter's own config filename, plus one frozen expectation.
 */
export function caseDirectoriesIn(tier: string): readonly string[] {
  return directoriesIn(tierRoot(tier));
}
