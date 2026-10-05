// Every corpus file a Module judges, read and parsed once.
//
// Published from this gate-owned Package because two Modules read the same
// files and neither may import the other (ARCH-008 §1.1). Before this, each
// Module read the file, split the frontmatter block and ran the YAML parse on
// its own; a file both governed was parsed twice, and "stop at the first
// unreadable file" was written twice. Now the Core answers once per file with
// the frontmatter MAPPING and the body, and never what a field means
//: `type` extraction stays in `body-structure-harness`.
//
// `parseDocument` ships beside `readCorpus` for the one caller that reads a
// single file outside a batch: `--assess`, whose absent-is-advice policy is its
// own and so cannot go through a corpus refusal.

export type {
  CorpusDocument,
  CorpusRead,
  Frontmatter,
  ParsedDocument,
  Unreadable,
} from './lib/document/document.types.ts';
export { parseDocument } from './lib/document/parse-document.pure.ts';
export { readCorpus } from './lib/read/read-corpus.impure.ts';
