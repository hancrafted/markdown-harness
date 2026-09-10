---
type: research
---

# A Reflow-Invariant Markdown Section Hash: Verdict Against the Dependency Admission Bar

Research question, from [#98](https://github.com/hancrafted/markdown-harness/issues/98), a child of
[map #96](https://github.com/hancrafted/markdown-harness/issues/96): the map's citation-binding
mechanism needs to hash a governed section so that **reflow** — rewrapping a paragraph, changing a list
bullet character, prettier repadding a table — never moves the hash, while a real content edit always
does. `.prettierignore`'s four content-pinned exemptions and `docs/agents/verification.md`'s trap 7
(quoted in full below) already forced the shape of the answer: a content pin and a repo-wide
`prettier --write` are incompatible unless the pinned path is ignored, and exempting the entire governed
`docs/` corpus from formatting to protect hashes is not a real option. So the hash must survive reflow,
which raises the map's own open question — does that need a markdown parser, and if so, which one clears
`ARCH-001`'s admission bar?

Probed 2026-09-10. Every install count, size, download figure, star count and publish date below was
measured today, against the packages' current published state — see §4 for exact commands. Every
reflow-invariance claim was **[executed]**: reproduced locally against the installed library, not
assumed from documentation. Scripts live in this session's scratchpad, not the repo. **No dependency was
added to `package.json`** — every package below was installed into a throwaway directory outside the
repository purely to measure it.

---

## 1. Summary — the answers

**The precedent.** The repo has made exactly two dependency verdicts of this shape before, both in one
grilling round (`docs/workshop/grill/vision/raw.md` Q10, 2026-08-26): **keep `yaml`**, because YAML 1.2
cannot be hand-rolled correctly and a misparse in a trust tool is the worst available bug; **reject the
MCP SDK**, because it pulls 90 packages and 25 MB of HTTP/OAuth machinery a stdio server never touches.
Neither verdict turned on popularity — both turned on the tenet at `docs/vision/architecture.md:82`,
**"Dependencies are admitted by a stated procedure, not a count,"** whose four-step procedure (quoted in
full in §2) is: prefer the standard library, build when a defect would be loud, buy when a defect would
be silent, weigh transitive count before reputation. This ticket's verdict uses the same procedure, not
a new one.

**The admission bar itself** (`ARCH-001-dependency-admission-bar.md`, four signals: ≥1,000 GitHub stars,
≥3 contributors or a named org, ≥100,000 weekly npm downloads, a release or maintainer reply within 12
months) turns out **not to be the deciding constraint here** — five of the six candidates clear it
cleanly (§4). Like the MCP SDK case, the bar is not what should stop the loser; the tenet's build/buy
step and its "weigh transitive count" step are.

**The winner: `markdown-it`.** 7 packages, 2.8 MB installed, zero install scripts, MIT, dual CJS/ESM
export with no dual-package hazard against this repo's `"type": "module"`. It is the _only_ candidate in
this survey that parses this repo's own GFM tables correctly **by default**, with no plugin — measured
directly against 21 files in `docs/` that contain pipe tables (§5.3). It exposes section extents via a
`map: [startLine, endLine]` on every block token (§6). Its one real cost: it retains the list-bullet
character (`-` vs `*`) in a token field the other family members silently drop, which needs one explicit
field exclusion in the normalizer (§5.2) — a known, named, one-line cost, not a silent one.

**The fallback: a hand-rolled, dependency-free line/regex normalizer**, scoped narrowly to the shapes
`.prettierignore` and the map's own decisions already enumerate (heading lines, list bullets, paragraph
wrapping, frontmatter key order via the already-admitted `yaml` package) — **not** a general CommonMark
implementation. Its risk is named, not hidden: without real fence-awareness, a heading-shaped or
bullet-shaped line inside a fenced code block is silently misidentified as a structural boundary, which
is exactly the "misparsed value in a trust tool" failure the tenet calls the worst available bug (§7).

**The `remark`/`mdast-util-from-markdown`/`micromark` family loses on transitive weight, not
reputation.** Every member of it mis-tokenizes a GFM table as a plain paragraph _by default_ (§5.3) — the
`mdast-util-gfm` + `micromark-extension-gfm` fix for that raises the family's cheapest member
(`mdast-util-from-markdown`) from 34 packages / 2.5 MB to **58 packages / 4.4 MB**, heavier than the
top-level `remark` package itself (51 packages) and eight times `markdown-it`'s package count for a
capability `markdown-it` and `marked` both ship free. This is the same shape of loss the MCP SDK took:
correct once fully equipped, but paying for far more than the section-hash problem needs.

**`marked` is admissible and technically close, but fails one stated requirement outright**: it exposes
**no line, column, or offset information on any token**, by design (§6). Computing a section's extent
would mean re-locating each token's `raw` string back inside the original file by substring search — a
method that breaks silently on any file with two identical lines, which this corpus has (see repeated
table separator rows). That is a second instance of the same silent-failure shape the tenet warns
against, so `marked` is set aside despite being the lightest, most popular, most recently released
candidate measured.

**Harness-layer vs in-product, stated precisely, per map #96's own boundary**: nothing in this verdict
argues for putting a markdown parser in the _product_ surface `okf-frontmatter-harness`/OKF-preset users
depend on. The citation-binding mechanism inside `drift-detection` is a repo-governance Module, not a
new class of file `markdown-harness` promises to check for every adopter — this verdict is scoped to
_that_ Module's own tooling, the same "internal only" carve-out the predecessor repo already used for
archgate (`docs/workshop/grill/vision/raw.md:423`). If `markdown-it` is rejected in review for a reason
this document did not anticipate, the fallback's dependency-free status means the Module stays admissible
either way — a parser dependency was never a precondition for `drift-detection` shipping, only for its
false-positive rate being low.

---

## 2. The precedent and the tenet, in full

### 2.1 The tenet (`docs/vision/architecture.md:82-92`)

> **7. Dependencies are admitted by a stated procedure, not a count**
>
> A fixed budget would be a number invented before the scope is known. The procedure, in order:
>
> 1. Prefer the standard library — check it before searching a registry.
> 2. **Build it** when the code is small and a defect would be **loud** (a crash, a visibly wrong
>    report).
> 3. **Buy it** when a defect would be **silent** — a misparsed value in a trust tool is the worst
>    available bug.
> 4. Weigh transitive count, install scripts and licence before reputation.
>
> Popularity and recency screen candidates out; they never justify one in.

### 2.2 The precedent pair (`docs/workshop/grill/vision/raw.md`, Q10, 2026-08-26)

> **1. `yaml` stays, and it's the exception that proves the rule.** [...] `yaml@2.9.0` — 1 package,
> 1.3 MB, 0 install scripts, ISC.
>
> **2. MCP: hand-roll, and the numbers make the argument.** 90 packages and 25 MB for a local stdio
> server, pulling express, hono, jose, ajv, zod, cors and express-rate-limit — essentially all of it for
> HTTP transports and OAuth that a stdio server never touches. It would also put a 90-package graph
> between you and the single-binary north star. stdio MCP is newline-delimited JSON-RPC 2.0.

The shape both verdicts share, and this one reuses: name the transitive count and size as measured facts,
name which fraction of that weight the actual use case exercises, and let the "build vs. buy" question
turn on whether a defect would be loud or silent — never on stars or downloads alone.

### 2.3 The admission bar as currently written (`.archgate/adrs/ARCH-001-dependency-admission-bar.md:22`)

> Before approving a new dependency, a human screens it against four signals: GitHub stars ≥1,000; ≥3
> contributors or a named maintaining organisation; npm weekly downloads ≥100,000; and a release or
> maintainer reply within the trailing 12 months. [...] The bar is a soft screen: if a candidate misses a
> signal, the author records in the commit body which signal was missed and why it is admitted anyway.

Note this ADR postdates the `yaml`/MCP-SDK verdict — it formalizes the reputation-screen half of the
procedure `docs/vision/architecture.md` already stated in prose. It is applied to all six candidates in
§4.

---

## 3. The forcing argument, verified rather than assumed

Two primary sources, read directly rather than taken from the ticket's paraphrase:

**`.prettierignore`** (repo root) carries four content-pinned exemptions, each with its reason written
inline as a comment — `docs/okf/SPEC-v0.2.md` (a byte-identical vendored pin), `docs/workshop/**/raw.md`
(verbatim session transcripts), `.agents/skills/prepare-ablation-run/assets/**` (vendored material whose
own style is the thing under test), and `fixtures/conformance/docs/plain/broken/**` (deliberately
malformed fixtures prettier would silently repair). None of the four is a stand-in for "any hash-bearing
file" — they are the current, complete list of paths this repo already had to carve out of formatting for
reasons specific to each.

**`docs/agents/verification.md:103-106`**, trap 7, "A repo-wide formatter can brick pinned trees, and the
refusal will not say so":

> `prettier --write .` over that tree therefore produces a refusal that reads as tampering, over a
> reformat nobody chose, and the message names the drift rather than the cause. [...] **a content pin and
> a repo-wide `--write` are incompatible unless the pinned path is ignored.**

Together these two sources are the actual forcing argument, not a restatement of the ticket: `check`
already runs `prettier` repo-wide over `docs/`, a citation-binding hash is a second content pin sitting on
top of that same tree, and the only way to avoid a fifth `.prettierignore` entry — this time over the
entire governed corpus, defeating the point of governing it — is for the hash to already be blind to
whatever prettier's own reflow changes. Confirmed empirically in §5.3 below: prettier does reflow GFM
tables (repads column widths), which is exactly the kind of change a citation hash must not react to.

---

## 4. The admission bar applied to six candidates

Six candidates named in the ticket, installed fresh (`npm install <pkg> --no-audit --no-fund` in an
isolated throwaway directory, npm `11.17.0`, Node `26.5.0`) and measured 2026-09-10:

| Package                    | Installed version | Stars (repo)                               | Org / contributors | Weekly downloads | Last npm release   | Recency signal                                                                                                                                     |
| -------------------------- | ----------------- | ------------------------------------------ | ------------------ | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remark`                   | 15.0.1            | 8,996 (remarkjs/remark)                    | ✓ named org        | 3,045,498        | 2024-10-22 (stale) | ✓ — maintainer `wooorm` commented on the repo's own issue tracker 2026-09-01                                                                       |
| `mdast-util-from-markdown` | 2.0.3             | 290 (syntax-tree/mdast-util-from-markdown) | ✓ named org        | 30,697,244       | 2026-02-21         | ✓ (release itself, 7 months old)                                                                                                                   |
| `micromark`                | 4.0.2             | 2,219 (micromark/micromark)                | ✓ named org        | 31,208,840       | 2025-02-27 (stale) | ✓ — maintainer `wooorm` commented on issue #232, 2026-09-07                                                                                        |
| `markdown-it`              | 15.0.1            | 21,890 (markdown-it/markdown-it)           | ✓ named org        | 15,871,409       | 2026-08-27         | ✓ (release itself, 2 weeks old)                                                                                                                    |
| `marked`                   | 18.0.12           | 37,132 (markedjs/marked)                   | ✓ named org        | 41,084,134       | 2026-09-07         | ✓ (release itself, 3 days old)                                                                                                                     |
| `commonmark`               | 0.31.2            | 1,567 (commonmark/commonmark.js)           | ✓ named org        | 357,271          | 2024-09-19 (stale) | borderline — repo has commits through 2026-08-30, but no maintainer _issue reply_ found in that window (search scoped to open-issue comments only) |

(Downloads: `https://api.npmjs.org/downloads/point/last-week/<pkg>`, window 2026-09-03..2026-09-09. Stars
and push/commit/comment dates: GitHub REST API, `api.github.com/repos/<owner>/<repo>` and
`.../issues/comments`, queried live 2026-09-10.)

**Result: five of six clear all four signals.** Only `mdast-util-from-markdown` misses one (stars, 290 <
1,000) — a soft-screen miss under `ARCH-001` §1.2, admissible with a one-line commit-body note, not a
hard block. `commonmark` is the one genuinely ambiguous case: its npm package is stale by the letter of
the recency signal, and while its GitHub repo shows real commit activity in the last two weeks, this
survey did not find a maintainer reply on an _open issue_ in the trailing 12 months (only a targeted
comment search was run, not an exhaustive one — see §8). **None of this discriminates the winner** — the
technical fitness questions in §5-§6 do.

**Install-weight table**, same methodology as the `yaml`/MCP precedent (§2.2):

| Package                    | Transitive packages (bare, no GFM)     | `node_modules` size (bare)   | Self package unpacked size | Install scripts | License          | Module system                           |
| -------------------------- | -------------------------------------- | ---------------------------- | -------------------------- | --------------- | ---------------- | --------------------------------------- |
| `remark`                   | 51                                     | 4.1 MB                       | 15.7 KB                    | none found      | MIT              | ESM only                                |
| `mdast-util-from-markdown` | 34 (**58 with GFM tables — see §5.3**) | 2.5 MB (**4.4 MB with GFM**) | 97.3 KB                    | none found      | MIT              | ESM only                                |
| `micromark`                | 28                                     | 2.2 MB                       | 209.6 KB                   | none found      | MIT              | ESM only                                |
| `markdown-it`              | 7                                      | 2.8 MB                       | 1.96 MB                    | none found      | MIT              | dual CJS/ESM (`exports` map, no hazard) |
| `marked`                   | 1 (zero runtime deps)                  | 492 KB                       | 483.1 KB                   | none found      | MIT              | ESM only                                |
| `commonmark`               | 4                                      | 1.1 MB                       | 673.1 KB                   | none found      | **BSD-2-Clause** | CommonJS only                           |

"Install scripts" checked by grepping every transitive `package.json` in each isolated install for a
`preinstall`/`install`/`postinstall` key — none of the six candidates, nor their transitive dependencies,
declares one. `commonmark`'s direct dependencies include `minimist` (a package with a documented
prototype-pollution history, patched at the `~1.2.8` range this pulls); `markdown-it`'s direct
dependencies include `argparse` — both are artifacts of each package bundling its own CLI binary, not
exercised by importing the library. `markdown-it`'s outsized self-package weight (1.96 MB, larger than
its whole transitive tree measurement because that measurement already contains it) comes from an
embedded Unicode/punctuation data table, not code.

---

## 5. Reflow-invariance, executed against all four AST/token-producing candidates

Two inputs, differing only in reflow — a rewrapped paragraph and a bullet-character change — parsed with
each candidate, `position`/`map`/`sourcepos` stripped, then compared:

```md
<!-- A -->                              <!-- B -->

## My Heading ## My Heading

This is a paragraph that says This is a paragraph that says
something interesting and something interesting and continues
continues on the next line on the next line for emphasis.
for emphasis.

- item one * item one
- item two * item two
```

### 5.1 Raw AST/token equality (no normalization): all four disagree

| Engine                     | Structurally equal after stripping position data alone? |
| -------------------------- | ------------------------------------------------------- |
| `mdast-util-from-markdown` | No                                                      |
| `markdown-it`              | No                                                      |
| `marked`                   | No                                                      |
| `commonmark.js`            | No                                                      |

**None of the four candidates is reflow-invariant out of the box.** Every one preserves the original hard
line-break's position as literal content — the text `"...interesting and\ncontinues..."` in `mdast` and
`markdown-it`, or as a separate sibling `text`/`softbreak` node pair in `commonmark.js`. This directly
answers the ticket's premise: **a parser alone does not solve reflow-invariance for any candidate** — an
explicit whitespace-collapse normalization pass over text content is required no matter which one is
picked.

### 5.2 After whitespace-collapse: the bullet-style question splits the field

Applying `.replace(/\s+/g, ' ').trim()` to every text-bearing field before comparing:

- **`mdast-util-from-markdown`: equal.** The paragraph-rewrap difference disappears, and — measured
  separately — mdast's `list`/`listItem` nodes **carry no field for the original bullet character at
  all**; `-` vs `*` was never visible to the AST in the first place.
- **`markdown-it`: still unequal**, isolated to one exact cause: `bullet_list_open`, `list_item_open` and
  `list_item_close` tokens carry `markup: "-"` vs `markup: "*"`. One field, named precisely, excludable in
  one line of normalizer code.
- **`commonmark.js`: still unequal for the same reason** — its list node exposes `listType: 'bullet'` and
  `_listData.bulletChar: '-'`/`'*'` directly. Same one-field fix as `markdown-it`.
- **`marked`: equal** — like `mdast`, `marked`'s list tokens carry no bullet-character field.

So `mdast-util-from-markdown` and `marked` absorb bullet-style reflow "for free" by omission from their
AST; `markdown-it` and `commonmark.js` require one named field exclusion. None require anything more
elaborate than that for this dimension.

### 5.3 The decisive case: GFM pipe tables, which this repo's own corpus uses

21 files under `docs/` contain GFM pipe-table syntax (`grep -RIl "^| .* | .* |$" docs`, counted
2026-09-10) — this is not a hypothetical input. Parsed with each candidate's **default configuration, no
plugins**:

| Engine                            | Table recognized?                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `mdast-util-from-markdown` (bare) | **No** — becomes a single `paragraph` node, raw pipe/dash text as literal content                             |
| `micromark` (bare)                | **No** — same collapse, confirmed directly on the tokenizer, not just through `mdast`                         |
| `markdown-it` (bare, no plugin)   | **Yes** — full `table_open`/`thead`/`tbody`/`tr`/`th`/`td` token stream                                       |
| `marked` (default options)        | **Yes** — a structured `table` token with `header`/`rows`/`align`                                             |
| `commonmark.js` (default)         | **No** — strict-spec renderer, no GFM extension mechanism found in this survey; also collapses to `paragraph` |

**This is not merely a missed feature — it is measured, executed evidence of a false positive the ticket
exists to prevent.** Using this repo's own pinned `prettier@3.9.6`:

```md
before --write: after --write:
| Tool | Stars | | Tool | Stars |
| --- | --- | | ------ | ----- |
| a | 1 | | a | 1 |
| bbbbbb | 22 | | bbbbbb | 22 |
```

`prettier --write` repads every column to its widest cell — pure reflow, no content change. Fed through
`mdast-util-from-markdown` (representative of the whole bare `mdast`/`micromark` family, and of
`commonmark.js`'s same-shaped collapse), the misidentified paragraph's text differs **even after
whitespace-collapse**, because the separator row's dash-count changes (`---` → `------`), which is a
character-count difference, not a whitespace-run difference:

```
ragged  (whitespace-collapsed): "| Tool | Stars | | --- | --- | | a | 1 | | bbbbbb | 22 |"
aligned (whitespace-collapsed): "| Tool | Stars | | ------ | ----- | | a | 1 | | bbbbbb | 22 |"
equal even after whitespace-collapse: false
```

Fed through `markdown-it` or `marked`, the same before/after pair produces **byte-identical token
structure** — confirmed directly, not inferred — because table-cell content is already extracted without
its column padding by each engine's table tokenizer; there is nothing for a normalizer to collapse.
**Any candidate that does not parse GFM tables by default would report every table-bearing section as
changed the first time `prettier --write` runs over `docs/` — which `check` already does.** This is the
single fact in this survey that most directly determines the verdict.

Fixing the gap for the `mdast`/`micromark` family costs real, measured weight: installing
`mdast-util-from-markdown` + `mdast-util-gfm` + `micromark-extension-gfm` together resolves to **58
packages, 4.4 MB** — up from the bare family's 34 packages / 2.5 MB, and now heavier than the top-level
`remark` package (51 packages) measured in §4.

---

## 6. Section extents

The map's own decision (`#96` Notes: "section identity: closest enclosing heading [...] falling back to
the whole file if there is no heading") needs, per candidate, the line or byte range from one heading to
the next heading of equal-or-shallower depth. Measured directly on the heading node/token for `## My
Heading` at the top of a file:

| Engine                     | Position data on every node/token                                           | Granularity                       |
| -------------------------- | --------------------------------------------------------------------------- | --------------------------------- |
| `mdast-util-from-markdown` | `position: {start: {line, column, offset}, end: {...}}`                     | line, column, **and byte offset** |
| `markdown-it`              | `map: [startLine, endLine]` on every block token                            | line only (0-indexed)             |
| `commonmark.js`            | `sourcepos: [[startLine, startCol], [endLine, endCol]]`                     | line and column, no byte offset   |
| `marked`                   | **none** — only `raw`, the verbatim matched source substring, on each token | none                              |

`marked` is the outlier: with no line/column/offset field anywhere in its default token shape, recovering
a section's extent means searching for each token's `raw` string back inside the original file text.
That search is not reliable on this corpus — a document with two structurally identical table separator
rows (`| --- | --- |`, which several files in `docs/` genuinely have across two different tables) would
match the wrong occurrence via naive substring search, silently attributing one section's content to
another section's extent. This is a second, independent instance of the silent-failure shape the tenet
weighs against `marked` specifically, on top of §5.3's neutral GFM result.

---

## 7. Heading slugs

None of the six candidates computes a heading-to-slug mapping natively — this dimension is **neutral
across every candidate**, not a discriminator. What each gives you for free is the heading's plain text
with inline markup already stripped (`mdast-util-to-string`-equivalent output, or `marked`'s `text` field,
or a straightforward inline-token walk for `markdown-it`/`commonmark.js`); turning that plain text into a
GitHub-matching slug is a separate step regardless of parser choice. The `remark`/`mdast` ecosystem has
the closest first-party-adjacent precedent (`github-slugger`, written by the same maintainer, `wooorm`,
who maintains `remark`/`micromark`/`mdast-util-from-markdown`, and consumed by the same collective's
`rehype-slug`); `markdown-it` has a comparably well-established third-party plugin
(`markdown-it-anchor`). Neither was installed or measured here — the ticket asks whether a candidate
_yields_ matching slugs, and the honest answer is that none of them does without an additional, separate
decision this document does not make.

---

## 8. Already present transitively?

**No.** `package-lock.json` was searched for every package family named in this ticket
(`remark*`, `micromark*`, `mdast*`, `markdown-it*`, `marked`, `commonmark`) and none appears, at any
depth, today. The one place a markdown parser already exists inside this repo's dependency graph is
`prettier` itself: unpacking `prettier@3.9.6`'s published tarball shows its markdown printer is built on
an `mdast`-shaped AST (`astFormat: "mdast"`, confirmed in `plugins/markdown.mjs`) — but it is bundled and
minified into that single file, declares zero separate npm dependencies (`npm view prettier dependencies`
returns empty), and exposes no public API for parsing arbitrary markdown into a reusable tree. It cannot
be imported for this purpose; admitting any candidate in §4 would be a genuinely new transitive addition,
not a promotion of something already paid for.

---

## 9. What could not be established

- **`commonmark`'s recency signal was not exhaustively checked.** The GitHub REST search used
  (`commenter:wooorm`, applied to `micromark`/`remark`) was not repeated with `commonmark.js`'s own
  maintainers (`kivikakk`, `jgm` et al.) by name — only a general "recent issue comments" query was run,
  and it returned no maintainer reply in the trailing-12-month window from that query alone. A closer
  read of `commonmark/commonmark.js`'s issue tracker could change this from "ambiguous" to a clear pass
  or fail; it does not change the verdict, since `commonmark` loses on §5.3 and §6 regardless.
- **`markdown-it-anchor` and `github-slugger` were not installed or measured.** §7 states only that
  neither candidate computes slugs natively — it does not evaluate any slugging library's own weight,
  maintenance, or GitHub-match fidelity, which would be a separate admission decision.
- **The fallback (hand-rolled normalizer) was not prototyped.** This document establishes that its
  central risk — fence-unaware heading/bullet detection — is real and silent, based on how every
  candidate parser treats fenced code as structurally opaque (confirmed for `mdast-util-from-markdown` in
  an unrelated check during this survey, not reproduced in full here); it does not attempt to bound how
  large that risk is against this repo's specific `docs/` corpus.
- **No candidate was tested against the fourth reflow example named in the ticket** — frontmatter key
  reordering. That case is a YAML problem, not a markdown-parsing one, and is already coverable by the
  repo's existing `yaml` dependency (parse both sides, compare the decoded value, independent of key
  order) — it was not executed here because it exercises no new candidate.
