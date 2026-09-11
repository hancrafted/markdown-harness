// The one order this tool sorts anything in.
//
// A second entry point rather than a second export on `list-markdown-files.ts`,
// because the two answer different questions: that one enumerates a corpus,
// this one orders names that may never have been walked to. A Package may
// expose several narrow entry points; what it may not do is re-export a subtree.
//
// It exists because a second Module needed the order and could not reach it.
// `indexes-harness` sorts a generated list of files AND folders, and folders are
// not in the corpus at all — the walker returns `descend` for a directory and
// never collects one. Copying the comparator there would have given the repo two
// orders that agree until one of them is edited.

export { inTreeOrder } from './lib/tree-path.pure.ts';
