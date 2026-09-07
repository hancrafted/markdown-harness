// The corpus: every markdown file under one root, flat and in one order.
//
// A Package of its own because enumeration is not resolution. `--audit`
// resolves rules against PATHS and never opens a file, so the walker had to be
// separable from everything that reads one — and the refusals it holds are
// worth proving on their own, before frontmatter parsing can confuse a failure.
//
// It returns a flat list and deliberately not a governed subset: "governed" is
// per-Module, and `--audit` needs every rule that selected each file rather
// than only the winner.

import { inTreeOrder } from './lib/tree-path.pure.ts';
import { walkTree } from './lib/tree-walk.impure.ts';

/**
 * Every markdown file under `root`, root-relative and lexicographically sorted.
 *
 * Paths are `/`-separated with no leading `./`, so they compare equal on
 * another machine. `**\/node_modules/**` and `**\/.git/**` are refused
 * unconditionally and no config can ask for them back — nothing here takes one.
 *
 * `undefined` means the tree could not be read, which its caller must turn into
 * a usage error rather than an empty corpus. An empty array is a real answer: a
 * root that exists and holds no markdown.
 *
 * @param root The corpus directory, exactly as the caller wrote it.
 */
export function listMarkdownFiles(root: string): readonly string[] | undefined {
  const found = walkTree(root);
  if (found === undefined) return undefined;
  return inTreeOrder(found);
}
