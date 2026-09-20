---
type: design-adr
status: accepted
---

# A selector is two literal axes — folders and file names — and carries no glob

A Rule and an `indexes:` directory key described file sets in two different languages, so deciding
whether two Modules' declarations overlap meant comparing globs, which cannot be done exactly in
either direction. The selector is now three keys holding literal tokens — `folders:`,
`folderTrees:` and `fileNames:`, at least one required — with `path:`, `fileName:` and the `Glob`
type retired rather than redefined, and `excludeFiles:` a list of the same selector object. A folder
token carries a mandatory trailing `/` and the corpus root is `./`, so both Modules spell one token
one way; a rule selects `(folder axis) × (name axis)`, and an absent axis means every.

Overlap is then a segment-boundary prefix test on the folder axis plus a string-set intersection on
the name axis: total, exact, and decided from config text with no tree read, which is what makes
both a hand-written cross-Module check and a later solver buildable. The mandatory slash is what
makes `startsWith` segment-safe without a second test — `"docs/visionary/".startsWith("docs/vision/")`
is `false`, closing the Jekyll defect tenet 5 names. Translation was proven exact across all
eighteen shipped selectors and four exclusion globs by a two-sided guard: 1,264 corpus comparisons
caught **one** of six planted wrong translations, while 342 `--query` witness comparisons over
nineteen non-existent paths caught **six** of six.

One wire-format casualty is accepted and named. `CONFIG_SELECTOR_AMBIGUOUS` becomes unreachable,
because three keys that are not exclusive of one another cannot be ambiguous; `CONFIG_SELECTOR_MISSING`
survives, redefined as a rule carrying none of the three. `glob-match.impure.ts` and the `GlobMatcher`
seam disappear, and with them
[`0005-host-dependent-glob-case-matching.md`](./0005-host-dependent-glob-case-matching.md) — the
builtin turns case-insensitive only inside a wildcard-bearing segment, and no wildcard survives. One
residue is accepted knowingly: an interior wildcard such as `docs/*/drafts/**` has no exact
translation, and none exists in this repo, in either corpus, or on any ticket. This is the config
language, so its home is `src/packages/config-contract/`, the fixture corpus and this record — never
an archgate ADR.
