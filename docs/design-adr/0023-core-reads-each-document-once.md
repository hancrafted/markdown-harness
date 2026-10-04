---
type: design-adr
status: accepted
---

# Core reads each Document once: `foundation/read-corpus.ts` hands every Module the parsed frontmatter and the body

Amends [`0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md`](./0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md)
(consequence 1: the fence rule is Core's) and leaves [`0012`](./0012-body-structure-is-a-second-module-selected-by-type.md)
intact: the Core still returns the frontmatter mapping and never what a field means.

## What was measured

Both Modules read the same files independently. Each read the bytes, split the frontmatter block and ran
`parseYamlDocument(…, 'empty-mapping')` on it; `body-structure-harness` then read `type` out of the result.
`foundation`'s read memo deduplicated the bytes, not the split or the parse, so a file governed by both
Modules was parsed twice. The batch loop "stop at the first file that is not `text`, answer
`{ kind: 'unreadable', path }`" was written twice, and so was the `unreadable` type.

## Decision

1. **One reader.** `foundation/read-corpus.ts` publishes `readCorpus(root, paths)`, answering
   `{ kind: 'read', documents }` or `Unreadable`, and the types `CorpusDocument`, `ParsedDocument`,
   `Frontmatter` and `Unreadable`. Each document carries its `path`, its parsed `frontmatter` and its `body`.
2. **`Frontmatter` has four states: `absent`, `unterminated`, `unparseable` and `mapping`.** The Core keeps
   `unterminated` apart from `unparseable` because the two Modules read it differently: `body-structure-harness`
   treats it as a file with no body (0014), and `frontmatter-harness` reports it exactly as an unparseable
   block, as before. That collapse is now one branch in `frontmatter-harness/lib/check/file-verdict.pure.ts`.
3. **The parse is memoised against the gate's own answer.** The memo is keyed by the remembered `FileRead`
   object, so the parse can neither outlive nor disagree with the bytes it came from, and a file read by two
   Modules in one invocation is split and parsed once.
4. **`type` extraction stays in `body-structure-harness`** (`lib/document/document-type.pure.ts`), per 0012.
5. **`parseDocument` is published too, for `--assess`.** It reads one file whose absence is advice rather
   than a corpus refusal, so it cannot go through `readCorpus`; it still takes the Core's split and parse.
6. **Retired:** `body-structure-harness/lib/read/corpus-read.*`, `lib/document/document-parts.pure.ts`,
   `frontmatter-harness/lib/check/frontmatter-data.pure.ts`, `GovernedRead` and `UnreadableGovernedFile`,
   and `foundation/frontmatter-block.ts`, which no Module imports once the split is the Core's.

## Placement

`readCorpus` carries the effect, so its implementation is `lib/read/read-corpus.impure.ts` (ARCH-007) and
the host import stays in `lib/platform/` (ARCH-008 §2). The split and the parse are
`lib/document/parse-document.pure.ts` beside a unit suite (ARCH-006). The shapes are in `document.types.ts`
(ARCH-005).

## Behaviour

Unchanged. Absent, unterminated and unparseable outcomes, fault violation codes, and the first-unreadable
exit-2 refusal come out byte-identical, and the Conformance tiers are untouched.
