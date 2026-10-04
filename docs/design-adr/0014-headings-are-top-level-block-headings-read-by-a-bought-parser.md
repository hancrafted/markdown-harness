---
type: design-adr
status: accepted
---

# A heading is a top-level block heading, and a bought Markdown parser reads it

The Module's whole payload is the answer to "which headings does this body have", and a heading
read wrongly is a silent defect: a fenced `#` line counted as a second title, or a real section
missed, turns a verdict without a crash or a visibly wrong report. Tenet 7's procedure therefore
ends at **buy**, not build, and the candidate is [`marked`](https://github.com/markedjs/marked)
`~18.0.14`, used as a lexer only: the Module reads block tokens and never renders HTML. The
repository's one runtime dependency today is `yaml`, the standard library parses no Markdown, and
nothing already installed does either, so there was nothing to prefer under step 1.

## What was measured, on 2026-10-04, in a scratch directory outside the repository

| candidate                        | packages installed | size   | licence      | install scripts |
| -------------------------------- | ------------------ | ------ | ------------ | --------------- |
| `commonmark` 0.31.2              | 4                  | 1.1 MB | BSD-2-Clause | none            |
| `markdown-it` 15.0.2             | 7                  | 2.9 MB | MIT          | none            |
| `marked` 18.0.14                 | **1**              | 0.5 MB | MIT          | none            |
| `micromark` 4.0.3                | 29                 | 2.3 MB | MIT          | none            |
| `mdast-util-from-markdown` 2.1.0 | 35                 | 2.6 MB | MIT          | none            |
| `remark-parse` 11.0.0            | 43                 | 3.3 MB | MIT          | none            |

`marked` has no dependency of its own, so the transitive count that tenet 7 weighs first is zero. It
clears all four signals of the admission bar in `ARCH-001`, which is a human's screen and not a
check. The figures behind that screen, 37,221 stars, more than 100 contributors, 95.9 million weekly
downloads and a release on 2026-09-22, are **context only and carry no decision weight**: tenet 7
says popularity and recency screen candidates out and never justify one in. They are kept so the
reviewer can see the screen was run, and only one of them changed an outcome: the reference
implementation `commonmark` misses the recency signal, its last release being 2024-09-19, which
screened it out. Approving the addition is the reviewing human's act on the prototype branch, and the
commit that adds the dependency records that no signal was missed.

Behaviour was measured against the reference. Over all 652 examples of the CommonMark 0.31.2
specification, the sequence of top-level heading levels from `marked` agrees with `commonmark.js` on
**652 of 652**, with `gfm` on and with `gfm` off; `markdown-it` and `mdast-util-from-markdown` also
agree on 652 of 652. On a 23-shape corpus written for this decision (fences, indented code, setext,
closing hashes, blockquote, list item, HTML block, empty headings, tabs, CRLF) all four agree on
structure. `marked` lexed 2,000 documents of 4.5 KB in 286 ms. The one thing every candidate does the
same, and the reason the Module must act first, is that none knows about frontmatter: a `# comment`
line inside a YAML block is read as a first-level heading by all four. The measurement is a
snapshot; the Conformance cases below are what hold the behaviour in place when the version moves.

## What counts as a heading

| shape                                                            | counts?                                          |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| ATX heading, one to six `#`, then a space, a tab or the line end | yes                                              |
| `#Title`, seven or more `#`, a backslash-escaped `\#`            | no, it is paragraph text                         |
| up to three leading spaces before the `#`                        | yes                                              |
| four leading spaces                                              | no, indented code or paragraph continuation      |
| closing hashes, trailing whitespace                              | yes, and neither is part of the content          |
| empty heading, `#` or `## `                                      | yes, at its level, with empty content            |
| setext heading, `===` for level one and `---` for level two      | yes, content is the paragraph text above         |
| a `---` after a blank line                                       | no, a thematic break                             |
| inside a backtick or tilde fence, closed or running to the end   | no                                               |
| inside an HTML block, and an `<h1>` element                      | no, raw HTML is not Markdown                     |
| inside a blockquote or a list item                               | no, not a child of the document                  |
| inside the frontmatter block                                     | no, the block is removed before the body is read |

Only headings that are **direct children of the document** form the outline. A heading nested in a
blockquote or a list item belongs to that container, not to the document's structure, and a
template for a document kind is about the document's own sections. The frontmatter block is split
off with the Core's existing rule, whose reading is: the opening `---` is the first line, a byte
order mark and a trailing carriage return are tolerated, and the first later `---` closes it. A
file with no block is all body. A block that never closes is the whole file and leaves **no body**,
so a structural Rule governing that file reports its required headings missing rather than reading
YAML as Markdown.

**A heading's content is its raw inline source**, with the ATX markers, the closing sequence and
surrounding whitespace removed, and never its rendering. `## **Findings**` has the content
`**Findings**` and does not match the title `Findings`. Raw content is what a person reading the
file sees, what a reimplementation in another language can reproduce without an inline renderer, and
what `marked` returns as the token's text. Multi-line setext content keeps its line breaks as `\n`,
so a two-line setext heading `Source:` then `One` has content that does not begin with `Source: `.
The byte order mark and the multi-line setext content are each held by a Conformance case in the
spec, [#220](https://github.com/hancrafted/markdown-harness/issues/220).

## Considered options

**Build a heading scanner.** Rejected under tenet 7: the code looks small, a line regex for `#`, but
every row of the table above beyond the first is a way that regex is silently wrong, and a correct
scanner must track fences, indented code, HTML blocks, containers and setext underlines, which is a
block parser. A defect would be silent, and that is the buy branch. **`commonmark`**, the reference
implementation: the behaviour is the reference by definition, and it was screened out on recency
alone. **`markdown-it`**: equal on behaviour, seven packages where `marked` is one. **`micromark`,
`mdast-util-from-markdown` or `remark-parse`**: equal on behaviour, 29 to 43 packages, which tenet 7
weighs first. `marked` is the candidate that agrees with the reference and brings nothing else with
it.

## Consequences

1. The frontmatter split is shared. It lives in the first Module today, and a Module may not import
   another, so the split moves to the Core's shared Package without changing a byte of behaviour.
   The `frontmatter` Conformance tier is what proves it did not move.
2. The dependency is one more thing a reimplementation in another language replaces. It reimplements
   by passing the `body-structure` tier, which is the point of tenet 4: the Conformance cases state
   the recognition rules above as executable specification and do not mention `marked`.
3. The measurement above is not repeated by the next session. A version bump is checked by the
   Conformance tier going red or staying green, not by re-running the comparison.
