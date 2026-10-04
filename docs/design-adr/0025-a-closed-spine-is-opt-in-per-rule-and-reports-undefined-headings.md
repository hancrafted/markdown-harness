---
type: design-adr
status: accepted
---

# A closed spine is opt-in per Rule, and a heading no entry matches is `BODY_STRUCTURE__HEADING_UNDEFINED`

Amends [`0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md`](./0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md)
(the leftover rule, and decision 2 on interleaving) and
[`0019-body-structure-violations-name-the-spine-entry.md`](./0019-body-structure-violations-name-the-spine-entry.md)
(the violation family, the order inside a file, and `--query`). Its companion,
[`0026-undefined-headings-config-validation.md`](./0026-undefined-headings-config-validation.md), amends
[`0020`](./0020-body-structure-config-validation-per-purpose.md). The spec both serve is
[#225](https://github.com/hancrafted/markdown-harness/issues/225), which amends [#221](https://github.com/hancrafted/markdown-harness/issues/221).

Two records because the two halves are asked by different readers: this one answers "what does a check
do with a heading", which a reimplementation of the walk needs, and 0026 answers "what does the loader
refuse", which a reimplementation of config validation needs. Each amends the records whose subject it
shares, so neither amendment reaches across.

## Where the decision came from

Han's review of [#223](https://github.com/hancrafted/markdown-harness/pull/223) settled three things, and none is reopened here.
**The spine stays open by default**: a heading no entry matches is permitted, which is what lets the
Module be added to an existing knowledge base without a finding per page. **A Rule may close its spine**
with `undefinedHeadings: forbid`. **`maxLevel` and a closed spine are mutually exclusive**, which 0026
turns into a fault. What was left for this record is the semantics: which headings the closure reports,
in what order, in what shape, how `--query` and `--audit` answer, and whether one heading may be reported
twice.

## What was measured

Read against `bodyViolations` and the 195 `body-structure` cases, on 2026-10-04:

1. **No existing Rule or case sets the key.** `undefinedHeadings` appears nowhere in `fixtures/`, and an
   unrecognised key is a config fault, so the key cannot have been read as anything yet. Every existing
   verdict and frozen finding is therefore untouched by any decision below, and a decision that moved
   one would be the wrong decision. None does.
2. **A heading no entry matches already has a place in the walk.** Leftover rule 3 of 0017 gives it to
   no entry and leaves it "constrained by `maxLevel` alone". The closure is that rule's second constraint,
   and it needs no change to the walk.
3. **`ownerOf` answers `undefined` for two different headings.** One matches no entry. The other matches
   only a `heading` entry that claimed nothing, which that entry reports as out of order. Reading the
   closure off `ownerOf` would report the second as undefined as well. The closure must therefore be
   decided from **matching**, never from the owner the walk assigned.
4. **A heading deeper than `maxLevel` already matches no entry**, because 0020 refuses an entry beyond
   `maxLevel`. Depth and entries are exclusive today, so a heading is never behind a `LEVEL_TOO_DEEP`
   and an entry violation at once. The closure keeps that property.
5. **No existing case freezes two violations of one entry.** A repeat outside an enumeration's run is
   reported out of order and is also counted, so with a maximum it can also be above it, and nothing in
   the corpus holds that. The double-report question #223 left open was therefore open in the corpus as
   well as in the record.

## Decisions

1. **A heading is undefined when no entry of the Rule's spine matches it.** An entry matches by level
   and pattern together, exactly as 0017 defines. The test is applied to every heading of the outline,
   of any level, the title included, and does not read the walk: a heading the walk left over, repeated,
   misplaced or outside a run is still defined if an entry matches it, and the entry reports it as it
   always did. This is hand-reproducible (tenet 1): for each heading, ask each entry.
   - A closed spine with no level 1 entry reports a title. A Rule that wants a title writes one.
   - A heading whose text an entry names, at a level the entry does not, is undefined: `### Overview`
     against an `## Overview` entry.
   - A closed spine with no `headings:` at all is legal, and every heading is undefined (0026).
2. **The violation is `BODY_STRUCTURE__HEADING_UNDEFINED`, one per heading.** Its shape beyond
   `violation` is `level`, `content` and `requirement: { undefinedHeadings: 'forbid' }`. `content` is the
   heading's raw inline source as [`0014`](./0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md)
   defines it, so the Contributor can find the heading and the response stores the value found and
   no sentence of ours. Per heading and not per level, which is the opposite of `LEVEL_TOO_DEEP`, on
   purpose: a too-deep level has one repair for every heading in it, flatten the level, so one violation
   per level loses nothing and keeps a report bounded. An undefined heading has its own repair, delete
   it, rename it or add an entry for it, and a count per level would leave the Contributor to work out
   which of the level's headings is the stranger. Two undefined headings with the same level and the same
   content are two violations. The cost is a report that grows with the document, accepted because a
   closed spine is opt-in and the documents it is written for are templated.
3. **Undefined headings come first, in document order.** 0019's order inside a file was levels beyond
   `maxLevel` ascending, then entries by index. It is now: undefined headings in the order they appear,
   or the levels beyond `maxLevel`, then entries by index. A Rule carries at most one of the two groups,
   because `maxLevel` and a closed spine are exclusive, so the slot is never shared. The closure goes
   first because it is judged on the outline alone, before the spine is walked, as depth always was.
   A document that has renamed a section therefore reads "undefined `Rationale`" and then "missing
   `Status`", which is the order the Contributor works it out in.
4. **One heading is behind at most one entry's violations, and an undefined heading is behind exactly
   one violation, its own.** This answers the double-report question. The existing behaviour stands and
   is now frozen: a repeat outside an enumeration's run is reported out of order and is counted, so one
   entry can report a place and a count for the same heading, `HEADING_OUT_OF_ORDER` beside
   `ENUMERATION_ABOVE_MAXIMUM` or `ENUMERATION_BELOW_MINIMUM`. They are different repairs, move the heading
   or delete it, and each is true on its own. Folding the count into the place would either hide a
   maximum that is exceeded or tell the Contributor to add a heading that already exists, which
   [`0017`](./0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md)
   decided against. What is **not** allowed is the closure adding a third report: a heading some entry
   matches is never also undefined. 0017 gives each leftover to one entry, and an undefined heading has
   no entry to give it to, so no heading is behind the violations of two entries.
5. **Interleaving narrows under a closed spine, and the walk does not change.** 0017 decision 2 lets any
   heading no later entry claims sit between an enumeration's repeats. Under `forbid` such a heading is
   undefined unless an earlier entry matches it, in which case it is a repeat or is out of order and is
   reported as such. So in a closed spine's passing document an enumeration's run holds its repeats and
   nothing else. The run, the cursor, the claims and every count are computed exactly as before; the
   closure is one more check over the same outline.
6. **`--query` states the key.** A candidate's `requirements` becomes
   `{ types?, maxLevel?, undefinedHeadings?, headings? }`, each copied from the Rule verbatim and an omitted
   key staying omitted, so `allow` is echoed when the Rule wrote it. An agent about to write a file is the reader this is for:
   a spine reads as a minimum, so an agent that is not told the spine is closed adds a section the template
   did not name, and learns it at `--check`. `forbid` is the one fact about a Rule's headings that cannot
   be read off `headings`, which is why it travels beside them.
7. **`--audit` is unchanged.** An audit row is a Rule's selector and intent beside four counts, and the
   audit answers which Rule wins which file. It echoes no payload key today, neither `maxLevel` nor
   `headings`, and the first one would be a new surface answering no question the audit asks. A closed spine
   is visible where an Operator looks for it: in the config, and in `--query`.
8. **`--assess` is unchanged**, as in 0019.

## Consequences

1. **The default is untouched.** A Rule that writes no `undefinedHeadings` reports nothing new, and every
   existing Conformance case keeps its verdict and frozen findings. The corpus changes are additions
   only: 23 cases in the `body-structure` tier, 7 in the `integrated` tier, and the rejected-config
   cases of 0026.
2. **The code grammar grows by one: 6 violation codes become 7.** `BodyStructureViolation` gains a
   member, which is a wire-format change the response contract owns.
3. **A consumer that assumed every body-structure violation carries `entry` or `found` must narrow.**
   The new member has neither. It carries `level` as `LEVEL_TOO_DEEP` does and `content`, a string, where
   `found` is a count everywhere else.
4. **The direction of the key is stated and not built on.** Deleting the key, or writing `allow`, widens
   what passes. 0017 declined a loosening-direction table at the Operator's instruction and this record
   adds none; a later detection pass has the direction in this sentence.
5. **The `markdown-harness` skill's unwired `query-hook.mjs` renders `maxLevel` and `headings` and will not
   render `undefinedHeadings`.** It is a skill asset, outside this spec, and unwired; the authoring skill
   (Phase 4) owns what an agent is told about a closed spine.

## Considered options

**Report undefined headings per level**, like `LEVEL_TOO_DEEP`. Rejected under decision 2. **Decide the
closure from the walk's leftovers**, so an undefined heading is a leftover no entry owns. Rejected: it
reports a misplaced heading twice, once as out of order and once as undefined, which measurement 3 shows
and decision 1 forbids. **Put the closure after the entries**, because it is the last thing a person fixes.
Rejected under decision 3: it is the first thing the outline says, and it shares a slot with depth.
**Count the heading outside an enumeration's run toward the place only**, so the count and the place never
share a heading. Rejected under decision 4. **Echo `forbid` in `--audit`**. Rejected under decision 7.
**Make `--query` silent about `allow`**, since `allow` is the default. Rejected: "a key it never wrote
stays omitted" is the rule that makes the answer a copy, and a copy has no cases to remember.
