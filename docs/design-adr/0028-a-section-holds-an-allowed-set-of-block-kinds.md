---
type: design-adr
status: accepted
---

# A section holds an allowed set of block kinds, declared by `mayHold` on a heading entry, and an unlisted kind is `BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED`

Amends [`0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md`](./0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md)
(what the Module reads of the lexer's tokens),
[`0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md`](./0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md)
(the entry), and
[`0019-body-structure-violations-name-the-spine-entry.md`](./0019-body-structure-violations-name-the-spine-entry.md)
(the violation family, the order inside a file, and `--query`). Its companions are
[`0027-a-heading-vocabulary-is-a-rule-level-list-of-exact-titles-per-level.md`](./0027-a-heading-vocabulary-is-a-rule-level-list-of-exact-titles-per-level.md)
and [`0029-vocabulary-and-block-kind-config-validation.md`](./0029-vocabulary-and-block-kind-config-validation.md). The spec
they serve is [#227](https://github.com/hancrafted/markdown-harness/issues/227).

A spine says which headings a document has and in what order, and says nothing about what is under them. An ADR's context is
prose, each of its decisions is a numbered list, and its references are a bulleted list, and a Contributor's agent that is told
the headings and nothing else writes a bulleted list where the order matters. Han settled the shape and none of it is reopened
here. **A heading entry, of either purpose, may declare the kinds of block its section may hold.** The starting vocabulary is
`prose`, `ordered-list` and `unordered-list`. **Omitting the key leaves the section unconstrained**, which is every entry that
exists, so no existing case changes. **Declaring it names an allowed set**: any mix, any order, any count of the listed kinds,
and a block of an unlisted kind is a violation with a new code. `[prose, ordered-list]` admits paragraphs and numbered lists
interleaved and rejects a bulleted list. For an enumeration the constraint applies to **each** repeat's section.
**Constraints inside a block, such as every list item opening with a bold `**DO**`, are out of scope** and nothing here is
shaped to anticipate them.

## What was measured

All against the repository's own lexer configuration, `marked` 18.0.14 narrowed to 0014's three ATX openings, on 2026-10-05,
in a scratch directory outside the repository. The top-level token sequence, which is the document's children, for each input:

| input                                                                          | top-level tokens                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `**Positive:**`, a blank line, `1. one` `2. two`                               | paragraph, list `ordered: true`                         |
| the same with no blank line between                                            | paragraph, list `ordered: true`                         |
| the same with `- one` `- two`                                                  | paragraph, list `ordered: false`                        |
| `1. a` `2. b` with `- x` `- y` nested under the first                          | one list, `ordered: true`                               |
| `- a` with `1. x` `2. y` nested under it                                       | one list, `ordered: false`                              |
| three levels of nested bullets                                                 | one list                                                |
| `1. a`, a blank line, `2. b` (a loose list)                                    | one list, `loose: true`                                 |
| a loose list whose first item holds a second paragraph or a fence              | one list                                                |
| `1. a`, a blank line, `prose`, a blank line, `2. b`                            | list, paragraph, list with `start: 2`                   |
| `1. a` `2. b` then `- c` `- d` with no blank line                              | list `ordered: true`, list `ordered: false`             |
| `1. a` then `1) b`, or `- a` then `* b`                                        | two lists                                               |
| `1. a`, `<!-- c -->`, `2. b`                                                   | list, html, list                                        |
| `1)` and `1.` markers; starts at 0, 5 and 123456789; a task list               | `ordered: true`; `ordered: true`; `ordered: false`      |
| `para` then `2. a` with no blank line                                          | one paragraph (a list cannot interrupt unless `1.`)     |
| `para` then `1. a` or `- a` with no blank line                                 | paragraph, list                                         |
| a fenced block in backticks or tildes, an indented block, a tab-indented block | code                                                    |
| `> quote`, and `> - a` `> - b`, and `> ## H`                                   | one blockquote each                                     |
| a pipe table, with or without a following line                                 | table                                                   |
| `<div>` ... `</div>`, `<!-- c -->`                                             | html                                                    |
| `<!-- c -->` on one line and text on the next                                  | html, paragraph                                         |
| `<b>x</b>` at the start of a line                                              | paragraph                                               |
| `***`, `---` after a blank line                                                | hr                                                      |
| `[ref]: /x`                                                                    | def                                                     |
| `Title` over `---` or `===`                                                    | heading                                                 |
| `- # H`                                                                        | one list: the heading is the item's, not the document's |
| a bare image line; an escaped `\- x`; `$$` fences                              | paragraph                                               |
| blank lines only                                                               | space                                                   |

Every top-level token measured was one of ten types: `paragraph`, `list`, `code`, `blockquote`, `table`, `html`, `hr`, `def`,
`space` and `heading`, and no other type appeared at the top level. The type is read straight off the token, and the one fact a
kind needs beyond it, whether a list is numbered, is the token's own `ordered` flag, so **no kind is parsed around the lexer**.
The measurement is a snapshot: the Conformance cases hold the behaviour when the version moves, and the next session does not
repeat it.

**This reads more of `marked` than the Module did, and says so.** Until now the Module read `heading` tokens and discarded
every other block and the `ordered` flag. It now reads the type of every top-level block and that one flag. That deepens the
reliance on `marked` without adding a dependency, and without describing the dependency as approved: admission of `marked`
under ARCH-001 is still a human's act, recorded as pending since #221. The remedy 0014 already names for a version bump, the
Conformance tier going red or staying green, covers this too.

## Decisions

1. **The key is `mayHold`, a list of kinds.** The brief's working name was `content`. That word already means a heading's raw
   inline source in 0014 and in the `content` field of `HEADING_UNDEFINED`, and a key and a violation field with one name for
   two things is how a reader of a response misreads it. `mayHold` says what it is, a permission and never a requirement, which
   matters because a `holds: [prose]` would read as "the section must contain prose" and an allowed set says no such thing.
   **This is this record's decision, not Han's.**
2. **A section is the blocks from its heading to the next top-level heading of any level.** A subsection's content is
   therefore governed by its own entry and never by its parent's: `## Decision` holding `### 1.` and `### 2.` has an own
   section of nothing, and each anchor's blocks are the anchor's. This confirms the lean. The alternative, a parent's section
   running to the next heading at its own level or above, would make a parent that lists `prose` condemn every list in its
   subsections. A heading inside a block quote or a list item is not a top-level heading, so it does not end a section, and
   a setext heading does.
3. **The preamble belongs to no section.** Blocks before the first heading are judged by nobody. Every Conformance case opens
   with an HTML marker and a paragraph before any heading, which is a preamble, so the rule is also what keeps an entry's
   `mayHold` from reading the case's own scaffolding.
4. **A section is judged by the entry that claimed its heading, and by nobody else.** A `heading` entry claims one heading and
   an `enumeration` claims the repeats inside its run, as 0017's walk decides. A heading the walk leaves over, a repeat of a
   `heading`, a repeat outside an enumeration's run, a misplaced heading, an undefined heading, a heading no entry matches in
   an open spine, and a heading a vocabulary admits, has a section nobody judges. The reasons are 0025 decision 4's: those
   headings are already behind a finding of their own, or are permitted on purpose, and a second report about the same
   heading is what that decision forbids; and a misplaced heading is moved before its content is judged, which the
   Contributor learns on the next run. **A parent's `mayHold` never reaches a subsection no entry claims**, which was the
   brief's lean about unclaimed headings' sections, confirmed.
5. **Block kinds: three are named and everything else is transparent.** The mapping from token to kind is total and written
   here so a reimplementation can match it.

   | token                         | kind                                                   |
   | ----------------------------- | ------------------------------------------------------ |
   | `paragraph`                   | `prose`                                                |
   | `list` with `ordered: true`   | `ordered-list`                                         |
   | `list` with `ordered: false`  | `unordered-list`                                       |
   | `code`, `blockquote`, `table` | transparent: not a kind, never reported, never counted |
   | `html`, `hr`, `def`, `space`  | transparent                                            |

   A transparent block is **neither allowed nor forbidden**, because the vocabulary has no name for it and so no Rule can list
   it. The alternatives were each wrong: counting a fenced block as `prose` is a lie about what prose is, and would change
   what `[prose]` means the day a `code` kind is added; making any unlisted block a violation would give an Operator a finding
   about a table that no spelling of the Rule can silence; and naming `code`, `table`, `quote` and `html` now widens a
   vocabulary Han called a start. Each of the four is considered when someone asks for a kind of it. **The cost is accepted and
   stated:** a section whose entry lists only `ordered-list` may hold a fence, a table or a quote without a finding, and adding
   a kind later is a contract change that moves cases and is reviewed as one. Paragraphs of inline HTML, and an HTML comment
   in the middle of a prose section, are why `html` is not `prose`.

6. **A bold label is prose.** `**Positive:**` ahead of a list is a paragraph token, so it is `prose`, and a section that lists
   only `ordered-list` fails on it. This is what a lexer says and what a rule that reproduces by hand says, and a rule that
   treated a short bold paragraph as a caption would need a definition of "short" nobody has. An Operator who wants captioned
   lists lists both kinds, as the ADR Contract's consequences section does.
7. **A list nested in a list item belongs to the outer list.** It is not a block of its own, so the outer list decides the
   kind: a numbered list under a bulleted item is part of the bulleted one. A list split by a paragraph at the left margin is
   two lists with a paragraph between, as CommonMark states it, and the paragraph is reported; a loose list is one list. A
   different list marker, or `1.` against `1)`, starts a new list of the same kind, which changes no verdict, and a bullet
   marker where a numbered list ran starts a bulleted one.
8. **An empty section passes.** `mayHold` is an allowed set and never a requirement, so a section with no block, only blank
   lines, or only transparent blocks, is fine. The set `[]` is a config fault (0029): it would forbid every named kind and
   sits one slip from omitting the key. **The cost:** a section that holds nothing directly, only subsections, such as the ADR
   Contract's `## Decision`, cannot be said, and a paragraph there passes. A form for "holds nothing" is a later decision, and
   a Conformance case freezes the limit.
9. **The violation is `BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED`, one per section per kind.** Its shape beyond `violation` is
   `entry`, `content`, `kind`, `found` and `requirement`. `entry` is the index of the entry that claimed the heading, `content`
   is the heading's raw inline source, which tells one repeat from another, `kind` is the offending kind, `found` is how many
   blocks of that kind the section holds, and `requirement` is the entry verbatim, so the allowed set travels with the finding.
   One list is one block however many items it has, so a report is bounded by sections times three. Per section and kind
   rather than per block because a violation carries no line, so two paragraphs in one section would be indistinguishable
   duplicates. The kinds of one section are in the order each first appears in it.
10. **Order inside a file.** The levels beyond `maxLevel`; then the headings the outline alone condemns, in document order;
    then spine entries by index; then **section content: by entry index, then by section in document order, then by kind in
    order of first appearance**. Content comes last because it is judged for the headings the walk claimed and so reads after
    every structural finding, and a Contributor repairs the structure first.
11. **`--query` states every `mayHold`**, because an entry is copied verbatim and the key rides inside it. No new requirement
    key is needed for this record. `--audit` and `--assess` are unchanged.

## Consequences

1. **The default is untouched.** An entry that writes no `mayHold` is unconstrained, and no existing Rule or case writes it, so
   every verdict and frozen finding stands.
2. **The loosening direction of `mayHold` is recorded.** Adding a kind to the set, or deleting the key, widens what passes. That
   amends 0017 consequence 2 for this key, as 0025 and 0027 do for theirs, and loosening detection stays out of scope.
3. **The entry gains a key.** 0017's entry becomes `{ purpose, level, pattern?, presence?, minCount?, maxCount?, mayHold?, intent? }`, and
   0020's table of what each purpose may carry gains a row: `mayHold` is optional on both purposes.
4. **The wire format grows** by this one violation and, in 0027, one more, so 7 codes become 9.
5. **A heading inside a list item stays out of the outline and keeps its text in the list.** Nothing here changes 0014's
   recognition table.

## Considered options

**`content` as the key.** Rejected under decision 1. **A section running to the next heading at its own level or above.**
Rejected under decision 2. **Every unlisted block kind a violation.** Rejected under decision 5. **Fenced code, tables and quotes
counted as `prose`.** Rejected under decision 5. **Judging a heading by every entry that matches it.** Rejected under decision 4:
an enumeration and a later `heading` entry may both match one heading, and the walk already decides which claims it, so the
section follows the walk. **A caption heuristic for bold labels.** Rejected under decision 6. **One violation per block.**
Rejected under decision 9. **A vocabulary-level `mayHold`**, so the sections under `### Added` could be held to a bulleted
list. Not built: Han scoped section content to the spine's entries, and the key is additive later.
