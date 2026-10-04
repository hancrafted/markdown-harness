/**
 * Read a set of corpus files and parse each once.
 *
 * ONE EFFECT, ONE PARSE. The bytes come from the memoised gate; the parse is
 * memoised here against the gate's own answer object, so a file two Modules
 * both govern is split and YAML-parsed once per process. The key is the
 * `FileRead` the gate remembers, which is why the parse can never outlive or
 * disagree with the bytes it was made from.
 *
 * Batched rather than read inside a judging loop, so the whole corpus is
 * refused on the first unreadable file rather than reported with that file
 * silently missing: a report that looks complete and is not.
 */

import type { CorpusDocument, CorpusRead, ParsedDocument } from '../document/document.types.ts';
import { parseDocument } from '../document/parse-document.pure.ts';
import { hostPathOf } from '../platform/node-host.impure.ts';
import type { FileRead } from './file-read.types.ts';
import { rememberedRead } from './read-memo.impure.ts';

/** Every parse already made, keyed by the gate's remembered answer. */
const parsed = new WeakMap<FileRead, ParsedDocument>();

/** The parse of a `text` answer, made at most once. */
function parsedOnce(found: FileRead & { kind: 'text' }): ParsedDocument {
  const remembered = parsed.get(found);
  if (remembered !== undefined) return remembered;

  const document = parseDocument(found.text);
  parsed.set(found, document);
  return document;
}

/**
 * Read each named file under `root`, in the order given.
 *
 * @param root The corpus directory exactly as the caller wrote it: never resolved.
 * @param paths Root-relative, normalised paths.
 */
export function readCorpus(root: string, paths: readonly string[]): CorpusRead {
  const documents: CorpusDocument[] = [];
  for (const path of paths) {
    const found = rememberedRead(hostPathOf(root, [path]));
    if (found.kind !== 'text') return { kind: 'unreadable', path: found.location };
    documents.push({ path, ...parsedOnce(found) });
  }
  return { kind: 'read', documents };
}
