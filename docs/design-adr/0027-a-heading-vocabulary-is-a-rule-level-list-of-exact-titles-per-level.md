---
type: design-adr
status: accepted
---

# A heading vocabulary is a Rule-level list of exact titles per level, position-free, and a heading outside it is `BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY`

Amends [`0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md`](./0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md)
(the flat spine, and consequence 2 on loosening),
[`0019-body-structure-violations-name-the-spine-entry.md`](./0019-body-structure-violations-name-the-spine-entry.md)
(the violation family, the order inside a file, and `--query`) and
[`0025-a-closed-spine-is-opt-in-per-rule-and-reports-undefined-headings.md`](./0025-a-closed-spine-is-opt-in-per-rule-and-reports-undefined-headings.md)
(what makes a heading undefined, and the double-report rule). Its companions are
[`0028-a-section-holds-an-allowed-set-of-block-kinds.md`](./0028-a-section-holds-an-allowed-set-of-block-kinds.md), which
answers what a section may hold, and
[`0029-vocabulary-and-block-kind-config-validation.md`](./0029-vocabulary-and-block-kind-config-validation.md), which answers
what the loader refuses. The spec all three serve is
[#227](https://github.com/hancrafted/markdown-harness/issues/227), which amends
[#221](https://github.com/hancrafted/markdown-harness/issues/221) and
[#225](https://github.com/hancrafted/markdown-harness/issues/225).

**Numbering.** Two different design-ADRs numbered 0025 exist on two branches that have not met: this lineage's
`0025-a-closed-spine-is-opt-in-per-rule-and-reports-undefined-headings.md`, and
`0025-operator-use-cases-are-preset-tiers-whose-config-is-the-preset.md` on `proto-v2-improved-architecture`. Neither is
renumbered, because a record's number is how every other record cites it. New records here start at 0027, the highest present
plus one, and whoever merges the two lineages picks the numbering then.

## Where the decision came from

The case that exposed it is the Keep a Changelog Preset, on the other lineage. Its third-level headings, `Added`, `Changed`,
`Deprecated`, `Removed`, `Fixed` and `Security`, repeat under every `## [version]`, interleaved with the version headings. The
spine is one linear sequence across levels, and an entry is one contiguous run, so no entry can say "these six titles, at this
level, anywhere": a run placed to begin at the first version never starts for the second, and one placed before the title is
empty. The Preset therefore works around the gap twice. A level-2 enumeration with `minCount: 0` before the title has an empty
run, so every second-level heading that nothing else claims lands outside it and is reported as `HEADING_OUT_OF_ORDER`. And a
level-3 enumeration carries a generated regular expression matching every heading **except** the six names, so a `### Misc`
is likewise reported out of order. Both reports carry a code that says the wrong thing; only the entry's `intent` says what is
wrong.

Han settled the shape of the fix and none of it is reopened here. **A vocabulary names exact titles allowed at one heading
level, and every heading at that level, wherever it sits in the document, must be one of them.** Matching is the **whole
title, exact and case-sensitive**: `### added` fails against `Added`, there is no fuzzy matching and no regular expression in
the list, and an Operator who wants either writes a `pattern` on an entry. The semantics are those of a **set**: any order, any
number of times, no grouping, so "`Added` before `Changed`" and "one `### Added` per version" are deliberately out of scope,
because ordering inside a section is a formatting convention. A heading outside the list is a violation with a new code and is
never reported as `HEADING_OUT_OF_ORDER`. Under `undefinedHeadings: forbid`, a heading the vocabulary admits counts as
claimed, so it is never also reported undefined, which is what lets a closed spine govern a changelog: version headings claimed
by an enumeration, interleaved third-level headings claimed by a vocabulary.

## What was measured

1. **`levels` cannot be the key.** The brief's lean was a Rule-level `levels:` block. The rejected-config tier holds
   `body-structure-retired-levels-key`, which freezes `levels` at the Rule as `CONFIG_UNRECOGNISED_KEY`, and 0017 consequence
   3 says the same. Reintroducing the key would change an existing case's verdict, so it is the wrong decision however well
   the word fits. `title`, `required` and `maxDepth` are frozen the same way, at the entry or the Rule, and no key may be chosen that one of those cases already refuses.
2. **A duplicate YAML key never reaches the loader.** The `yaml` parser refuses `Map keys must be unique`, so a form that
   keyed the vocabulary by level, `vocabulary: { 3: [...] }`, would get "one list per level" for free and would spell a level as
   a string. A list of items carrying a `level`, which is what `headings:` already is, needs a fault for a repeated level and
   spells the level as every other level is spelled.
3. **No existing Rule or case writes `vocabulary`**, and the key set of both the Rule and the vocabulary item is closed, so
   every existing verdict and frozen finding is untouched by any decision below. A decision that moved one would be the wrong
   decision. None does: all 218 `body-structure` cases and all 49 existing `body-structure` rejected configs agree with a
   throwaway copy of the Module patched to this record.
4. **The two catch-alls the Preset needs are both answerable.** The level-2 one is `undefinedHeadings: forbid`, which 0025
   already built, and the level-3 one is a vocabulary. With both, the Preset needs no catch-all, no generated expression and no
   `HEADING_OUT_OF_ORDER` that means "may not exist". The tier holds that shape as `vocab-closed`.

## Decisions

1. **The form is a Rule-level `vocabulary:` list of `{ level, allowed }` items.** `allowed` is a list of exact titles. This is
   the Operator-facing form and is **this record's decision, not Han's**: he settled the semantics and left the form open. The
   two candidates were (a) a Rule-level block of per-level title lists and (b) an `allowed:` list on an entry inside
   `headings:`, exempt from the ordered walk.
   - **(b) is refused.** An entry's place in `headings:` is its meaning, and 0017's whole structure is that order. An entry
     that is exempt from the walk is a position-free thing standing in an ordered list, so a reader of a diff would have to
     know which entries count. It also has no `purpose`: it is neither exactly one heading nor a counted run, and 0017 says
     `purpose` is mandatory with no default, so (b) needs a third purpose, which rewrites 0020's table of what each purpose
     may carry. It would need its own fault for `allowed` beside `pattern`, and it would claim every heading at its level
     anywhere, which a spine entry never does. **`CONFIG_ENUMERATION_PINS_TEXT` would not refuse (b)**: it is raised for an
     enumeration whose `pattern` is an anchored literal, and an entry carrying `allowed` and no `pattern` has no pattern to
     test. What it does refuse is the workaround an Operator would reach for without a vocabulary, six enumerations each
     pinned to one title as `^Added$`, which is precisely why an enumeration cannot say this.
   - **(a) keeps both honest.** The vocabulary says it is position-free by living outside the ordered list, and an entry in
     `headings:` keeps its place as its meaning. It reintroduces a per-level block, but for titles and never for counts, which
     is the only thing round one's `levels:` got wrong.
   - **The key is `vocabulary`**, not `levels`, for measurement 1, and the list's key inside an item is `allowed`, the word the
     first Module already uses for a list of permitted values. The glossary already has **Type vocabulary** for a different
     thing, the `type` values a repo recognises; the new term is **heading vocabulary**, defined in `CONTEXT.md`, and the two
     are qualified wherever both are in view.
2. **A title matches when it equals the heading's raw content, whole, exactly and case-sensitively.** Raw content is as
   [`0014`](./0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md) defines it: the closing sequence and the
   surrounding whitespace are not part of it, the markup is. So `### Added ###` is `Added`, `### **Added**` is `**Added**` and
   is outside a vocabulary that lists `Added`, and `### Added things` and `### Fix` are outside one that lists `Added` and
   `Fixed`. A title in the list is a non-empty string with no leading or trailing whitespace, because a heading's content never
   has either and such a title could never match (0029).
3. **A level is walked by entries or held to a vocabulary, never both.** A vocabulary at level 3 and an entry at level 3 would
   put one heading behind two kinds of finding, and an entry could match a heading the vocabulary refuses. The loader refuses
   the pairing (0029), so a heading at a vocabulary's level is judged by the vocabulary alone and a heading at an entry's level
   by the spine alone. A level that neither names is unconstrained by both, as it was.
4. **A heading the vocabulary admits is claimed; the closure asks entries and vocabularies.** 0025 decision 1 said a heading is
   undefined when no entry of the spine matches it. It is now undefined when no entry matches it and its level has no
   vocabulary. A heading at a vocabulary's level is therefore never undefined: it is admitted or it is outside the vocabulary.
5. **A heading is behind one source of finding, and a heading outside a vocabulary is reported once, as that.** This answers
   the double-report question. Under a closed spine a third-level heading outside the vocabulary is matched by no entry either,
   and so two checks could name it. The vocabulary finding wins, because it states the repair, one of these titles, where the
   closure says only that nothing names it. This restates 0025 decision 4 without changing what it froze: one heading is behind
   the violations of at most one entry, or behind the vocabulary's alone, or behind the closure's alone, and the one case it
   permitted, an entry reporting both a place and a count for a repeat outside its run, stands. The vocabulary can never
   produce `HEADING_OUT_OF_ORDER`, because no entry sits at its level.
6. **The violation is `BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY`, one per heading.** Its shape beyond `violation` is `level`,
   `content` and `requirement`, which is the vocabulary item for the heading's level, verbatim, `{ level, allowed }`, so the
   Contributor reads the six titles in the violation that names the seventh. `content` is the heading's raw inline source, so
   the response stores the value found and no sentence of ours. It is per heading and not per level for 0025 decision 2's
   reason: its repair is its own, rename it or delete it, and a count per level would leave the Contributor to find the
   stranger. Two headings with the same level and content are two violations.
7. **Order inside a file.** 0025 put undefined headings first, in document order, in the slot depth holds. The order is now:
   the levels beyond `maxLevel`, ascending by level; then the headings the outline alone condemns, **undefined and outside a
   vocabulary together, in document order whatever their level**; then spine entries by index; then section content (0028). A
   Rule may carry `maxLevel` and a vocabulary together, so depth and the second group are no longer exclusive, and depth stays
   first. The second group is judged on the outline before the spine is walked, as depth always was, so a document that
   renamed a section reads "outside the vocabulary `Improved`" and then "missing `Title`".
8. **`--query` copies the key.** A candidate's `requirements` becomes
   `{ types?, maxLevel?, undefinedHeadings?, vocabulary?, headings? }`, each copied verbatim, an omitted key staying omitted. An
   agent about to write a file is the reader this is for: it learns the six titles before it writes the seventh and learns it
   at `--check` otherwise. Every entry's `mayHold` rides inside its entry. **`--audit` is unchanged**, for 0025 decision 7's
   reason: it echoes no payload key today. `--assess` is unchanged.
9. **A vocabulary heading has no section constraint this round.** A vocabulary item carries `level` and `allowed` and no
   `mayHold`, and no entry claims the heading, so the section under `### Added` is judged by nobody (0028). Han's settled scope
   for section content is the entries of the spine. A vocabulary-level `mayHold` is the obvious next key, additive and not
   built.

## Consequences

1. **The default is untouched.** A Rule that writes no `vocabulary` reports nothing new, and every existing Conformance case
   keeps its verdict and frozen findings. The corpus changes are additions only, and 0030 and the spec list them.
2. **The code grammar grows by one here and by one in 0028: 7 violation codes become 9.** `BodyStructureViolation` gains two
   members, which is a wire-format change the response contract owns. A consumer that assumed a body-structure violation
   carries `entry` or `found` must narrow: `HEADING_NOT_IN_VOCABULARY` has `level` and `content` as
   `HEADING_UNDEFINED` does.
3. **The loosening direction of `vocabulary` is recorded and amends one sentence of 0017.** 0017 consequence 2 said "there is
   no loosening direction anywhere in this Module", which 0025 amended for one key. Adding a title to an `allowed` list,
   removing a vocabulary item, and deleting `vocabulary` all widen what passes, and that direction is recorded here and for
   `mayHold` in 0028. Everything else in 0017's consequence 2 stands: no direction table is carried, no other key is given one,
   and loosening detection stays out of scope.
4. **0017's consequence 1 is half answered.** The spine is still flat, and a heading that repeats under every section still has
   no count: "one `### Added` per version" cannot be said. What can now be said is the set of titles a level may take. The
   repeat's count and order stay out of scope, deliberately.
5. **The Preset migration is deferred, and the reason is the lineages.** The Preset and its tier live on
   `proto-v2-improved-architecture`, which has not met this one, so a change to them here would edit files that are not on
   this branch. Once they meet, the Preset can drop both catch-alls for `undefinedHeadings: forbid` and a vocabulary, and it
   will change some of its own verdicts when it does: a `### Added` before the title, frozen there as passing because a
   catch-all's run swallowed it, stays passing under a vocabulary on purpose, and a second-level heading before the title
   becomes undefined. That is a contract change in the Preset's tier, to be reviewed as one then. The migration is not
   attempted here, and [#227](https://github.com/hancrafted/markdown-harness/issues/227) holds the shape of the changelog
   Rule that shows it works.
6. **The `markdown-harness` skill's unwired `query-hook.mjs` renders neither `vocabulary` nor `mayHold`.** It is a skill asset
   and unwired, and the authoring skill (Phase 4) owns what an agent is told about either.

## Considered options

**A `levels:` block**, the brief's lean. Rejected under measurement 1: the key is frozen as unrecognised. **An `allowed:` list on
an entry in `headings:`.** Rejected under decision 1. **A map keyed by level.** Rejected under measurement 2: it spells a level
as a string and differs from every other level in the config. **Fuzzy or case-insensitive matching, or a regular expression in
the list.** Refused by Han, and the `pattern` of an entry is the spelling for either. **Order or a per-version count in the
vocabulary.** Refused by Han: a formatting convention. **Letting an entry and a vocabulary share a level, with the entry
claiming first.** Rejected under decision 3: "every heading at that level must be one of them" would then not hold, and a
reader of a diff could not tell which of two mechanisms judged a heading. **Reporting both findings under a closed spine.**
Rejected under decision 5.
