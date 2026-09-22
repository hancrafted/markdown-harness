---
type: design-adr
status: accepted
---

# A selector is two literal axes — folders and file names — and carries no glob

A Rule described the file set it governs as a glob, and the platform's matcher turns
case-insensitive inside any segment carrying a wildcard — so the same config produced a different
report on a case-insensitive filesystem than on a case-sensitive one, with nothing anywhere saying
why. The selector is now two keys holding literal tokens — `folders:` and `fileNames:`, at least
one required — with `path:`, `fileName:` and the `Glob` type retired rather than redefined, and
`excludeFiles:` a list of the same selector object under the same at-least-one rule. A folder token
carries a mandatory trailing `/` and selects that folder alone, the corpus root is `./`, a file name
is one literal basename compared case-sensitively, a Rule selects `(folder axis) × (name axis)`, and
an absent axis means every.

**Host-independence is the whole justification, and it is sufficient on its own.** An earlier draft
of this record rested on decidability — two literal extents' overlap being computable from config
text with no tree read, which a cross-Module contradiction check would have needed. That check was
cut from the epic, and with it the only caller. **No overlap or containment procedure is written**:
first-match-wins asks only "does this Rule select this file", so the selector predicate is all that
ships. The same draft named a third key, `folderTrees:`, for recursive selection; recursion was cut
too, so a subtree is now an enumeration its author maintains. The mandatory slash survives both
cuts on its own merit — it is what stops `docs/vision/` prefix-matching `docs/visionary/`, closing
the Jekyll defect tenet 5 names, and it keeps one folder spelled one way.

**Something had to carry the corpus file extension, and `--query` is where it shows.** `.md` used
to be spelled inside every glob. For `--check` and `--audit` that was already redundant: the tree
walk decides membership at `corpus-entry.pure.ts`, case-sensitively and deliberately not through
the platform matcher. For `--query` and `--assess` no walk runs, so nothing was left to tell
`notes.txt` from `notes.md`, and both would have answered `governed` — a measured change in a
frozen response field. **The conservative answer is taken**: those two commands ask the same
predicate the walk uses, through `foundation/corpus-membership.ts`, so today's answers are
preserved exactly and the extension lives in one place for all four commands. One residue is named
rather than closed: the walk also refuses `node_modules/`, `.git/` and dot-directories, and
`--query` does not — that is a fact about a walk rather than about a file name.

Translation was proven two-sidedly, on the Conformance tier's config, by **40 corpus comparisons**
over files that exist and **28 witness comparisons** over paths that do not. The asymmetry is the
point: a tree of real files can only say where a selector DOES reach, so every widening is
invisible to it. Proven by breaking it — the `research` exclusion retranslated by file name alone
turned the witness half red and left the corpus half green. Two divergences are accepted and named
in the frozen witnesses: `SKILL.md` is translated by name, so one outside `docs/skills/` is now
claimed by that Rule rather than by `plain` — a widened INCLUDE makes more files checked, where a
widened EXCLUSION would make files silently ungoverned.

One wire-format casualty is accepted. `CONFIG_SELECTOR_AMBIGUOUS` is unreachable, because two keys
that INTERSECT cannot be ambiguous; it and its Conformance case were retired in one change.
`CONFIG_SELECTOR_MISSING` keeps its spelling and means a Rule, or an exclusion, carrying neither
axis. `glob-match.impure.ts` and the `GlobMatcher` seam are gone, and with them
[`0005-host-dependent-glob-case-matching.md`](./0005-host-dependent-glob-case-matching.md). The
runtime floor `>=24.16.0 <25 || >=26.1.0` was measured for that matcher and is now wider than the
code needs; it is held unchanged here because widening it moves the refusal text, `engines` and the
smoke matrix together. One residue is accepted knowingly: an interior wildcard such as
`docs/*/drafts/**` has no exact translation, and none exists in this repo, in either corpus, or on
any ticket. This is the config language, so its home is `src/packages/config-contract/`, the
fixture corpus and this record — never an archgate ADR.
