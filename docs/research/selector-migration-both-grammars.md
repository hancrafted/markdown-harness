---
type: research
---

# Selector migration: both grammars, rule by rule

This note writes the two configs this repository commits — its own `markdown-harness.config.yaml` and the
Conformance suite's `fixtures/conformance/valid-test-config.yaml` — twice each. Once in the glob grammar they are
written in today, and once in the two literal axes that [#154](https://github.com/hancrafted/markdown-harness/issues/154)
adopts. Every rule appears in both, side by side, exclusions included.

It is a **prefactor, not a record of work already done**. Nothing in the repository uses the reduced grammar yet. The
note exists for two reasons. The first is that the epic's central premise — that an Operator can translate a config by
hand, and that translation is therefore cheap — is checked here before anything is built on it. The second is that
[#159](https://github.com/hancrafted/markdown-harness/issues/159) should be a _transcription_ of the tables below
rather than a _translation_ performed again from scratch, where it could come out differently.

A human reading this can still decide the reduced selector language is not the one they want. That decision is free
today and expensive after #159.

## The grammar being translated into

From the epic's prototype, the shape the decision turns on:

```ts
export interface Selector {
  folders?: readonly FolderPath[]; // that folder alone; no recursion
  fileNames?: readonly FileName[]; // literal basenames, extension included
}
```

- A **folder token** is repo-root-relative, carries a mandatory trailing separator, and selects **that folder alone**.
  There is no recursion anywhere in the language. The corpus root has its own token.
- A **file name** is one literal basename including its extension, compared case-sensitively.
- **At least one axis must be present.** A Rule carrying neither raises the selector-missing fault.
- **An absent axis means every.** Folders alone reach every file in those folders; a name alone reaches that name
  _anywhere in the corpus_; both together intersect.
- **Exclusions use the same selector object**, under the same at-least-one rule.

`excludeFiles` keeps its meaning under first-match: an excluded file is not exempted, it **falls through** to the next
Rule, and if nothing below matches it, it ends up **ungoverned**. That asymmetry is what makes one of the two
ambiguities below dangerous and the other harmless.

## How this note counts

Two conventions, stated once, because both numbers below are measurements and a measurement with an unstated unit is
an adjective.

**A token is one string in a selector list.** Today that is one glob in `path:` or `excludeFiles:`. Under the reduced
grammar it is one folder token or one file-name token. Token growth is the enumeration cost the epic asked to have
measured.

**A folder list reproduces every folder in the subtree the old glob spanned, including folders that hold no corpus
file today.** This is the note's one discretionary policy and it is worth stating plainly, because the cheaper choice
looks equivalent and is not. Measured against the platform matcher on Node 26.5.0:

| path                             | glob                      | matches |
| -------------------------------- | ------------------------- | ------- |
| `docs/foo.md`                    | `docs/**/*.md`            | `true`  |
| `docs/workshop/raw.md`           | `docs/workshop/**/raw.md` | `true`  |
| `docs/skills/SKILL.md`           | `docs/skills/**/SKILL.md` | `true`  |
| `index.md`                       | `**/index.md`             | `true`  |
| `docs/research/vendor/deep/x.md` | `docs/research/vendor/**` | `true`  |

`**/` matches **zero** segments as readily as many. So `docs/**/*.md` already reaches a file sitting directly in
`docs/`, and a folder list that omits `docs/` itself is a silent narrowing rather than a faithful transcription. The
folders carrying no markdown today are behaviourally inert today and are the only thing keeping a file added to one of
them governed tomorrow. They are counted at their real cost rather than quietly dropped.

## Ground truth

Both trees were enumerated from the working tree and cross-checked against `mh --audit`, so the "selects today"
column is a measurement rather than a reading of the glob.

The repository's own corpus holds **33 markdown files across 12 folders** (32 before this note was added to
`docs/research/`). The Conformance corpus holds **40 markdown files across 13 folders**, rooted at
`fixtures/conformance/`.

---

## Config A — `markdown-harness.config.yaml`

Two Rules. One of them carries two exclusions. Four translation units in total.

### A1 · `vision`

|                   |                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Today**         | `path: [docs/vision/**/*.md]`                                                                                                                                                                          |
| **Proposed**      | `folders: [docs/vision/]`                                                                                                                                                                              |
| **Selects today** | 2 files — `docs/vision/architecture.md`, `docs/vision/product.md`                                                                                                                                      |
| **Verdict**       | **Approximate**                                                                                                                                                                                        |
| **What it loses** | Recursion. `docs/vision/` has no subfolder today, so the two selectors agree on the current tree exactly. A subfolder created under `docs/vision/` is reached by the glob and not by the folder token. |
| **Tokens**        | 1 → 1                                                                                                                                                                                                  |

Only one translation is available: there is no single basename to key on. The Rule must stay **above**
`docs-carry-a-type`, and it still does — a folder token in both Rules' lists leaves first-match deciding, exactly as
the glob did.

### A2 · `docs-carry-a-type`

|                   |                                                                                                                                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**         | `path: [docs/**/*.md]`                                                                                                                                                                                                                                               |
| **Proposed**      | `folders:` — `docs/`, `docs/agents/`, `docs/design-adr/`, `docs/okf/`, `docs/research/`, `docs/research/parts/`, `docs/vision/`, `docs/workshop/`, `docs/workshop/grill/`, `docs/workshop/grill/vision/`, `docs/workshop/probe/`, `docs/workshop/probe/adr-routing/` |
| **Selects today** | 33 files, of which 2 are shadowed by `vision` and 2 excluded — 29 won                                                                                                                                                                                                |
| **Verdict**       | **Approximate**                                                                                                                                                                                                                                                      |
| **What it loses** | Recursion, at the widest blast radius in either config. One glob becomes twelve folder tokens, and any folder created anywhere under `docs/` is governed by nothing until this list is edited.                                                                       |
| **Tokens**        | 1 → 12                                                                                                                                                                                                                                                               |

Four of the twelve tokens — `docs/`, `docs/workshop/`, `docs/workshop/grill/`, `docs/workshop/probe/` — hold no
markdown today. They are included under the policy above. Dropping them would cost nothing today and would silently
un-govern the first file anyone adds to `docs/workshop/`.

A cheaper list of the eight folders that actually hold markdown is available and is **rejected**: it is the same
enumeration hazard the epic already accepts, made one notch worse for a saving of four tokens.

### A3 · exclusion — the pinned OKF specification

|                       |                                                       |
| --------------------- | ----------------------------------------------------- |
| **Today**             | `excludeFiles: [docs/okf/SPEC-v0.2.md, …]`            |
| **Proposed**          | `{ folders: [docs/okf/], fileNames: [SPEC-v0.2.md] }` |
| **Naive alternative** | `{ fileNames: [SPEC-v0.2.md] }`                       |
| **Selects today**     | 1 file, under either                                  |
| **Verdict**           | **Exact**                                             |
| **Tokens**            | 1 → 2                                                 |

The old selector is a literal path carrying no wildcard, so the intersection of one folder and one name reproduces it
**for all time**, not merely on today's tree. This is the only translation in either config with no future divergence
at all.

The naive alternative is listed because it is a token cheaper and looks equivalent. It is not: see
[the widening ambiguity](#ambiguity-1--a-name-only-exclusion-reaches-the-whole-corpus) below.

### A4 · exclusion — the workshop raw transcript

|                       |                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**             | `excludeFiles: […, docs/workshop/**/raw.md]`                                                                                                                    |
| **Proposed**          | `{ folders: [docs/workshop/, docs/workshop/grill/, docs/workshop/grill/vision/, docs/workshop/probe/, docs/workshop/probe/adr-routing/], fileNames: [raw.md] }` |
| **Naive alternative** | `{ fileNames: [raw.md] }`                                                                                                                                       |
| **Selects today**     | 1 file — `docs/workshop/grill/vision/raw.md` — under either                                                                                                     |
| **Verdict**           | **Approximate**                                                                                                                                                 |
| **What it loses**     | Recursion under `docs/workshop/`. The glob was written to anticipate workshop folders that do not exist yet; the folder list can only name the ones that do.    |
| **Tokens**            | 1 → 6                                                                                                                                                           |

**This is the exclusion the epic names, and it is the one place where both translations are wrong in different
directions.** Neither is future-proof, so the choice is made on _how each one fails_:

- The folder-list translation **narrows**. A new workshop session's `raw.md` is no longer excluded, so it becomes
  governed by `docs-carry-a-type`, fails the required `type` field, and `mh --check` exits 1 naming the file. That is
  a loud failure and an unmistakable prompt to edit the folder list.
- The name-only translation **widens**. Any file named `raw.md` anywhere in the corpus falls out of
  `docs-carry-a-type` and, with no Rule below it, becomes **ungoverned** — silently. A file nobody is checking is
  precisely the outcome the exclusion existed to avoid for a different file.

The folder list is chosen because a governance tool may fail loudly and may not fail silently. Six tokens for one
excluded file is the real price and it is paid deliberately.

---

## Config B — `fixtures/conformance/valid-test-config.yaml`

Ten Rules. One of them carries one exclusion. Eleven translation units in total. Paths are relative to the synthetic
corpus root `fixtures/conformance/`.

### B1 · `index-files`

|                   |                                    |
| ----------------- | ---------------------------------- |
| **Today**         | `fileName: index.md`               |
| **Proposed**      | `fileNames: [index.md]`            |
| **Selects today** | 4 files, at three different depths |
| **Verdict**       | **Exact**                          |
| **Tokens**        | 1 → 1                              |

`fileName:` already desugars to `**/index.md` — "a file of that name anywhere, including the repo root"
(`src/packages/frontmatter-harness/lib/rules/selector.pure.ts:23`). That is the reduced grammar's name-alone rule
verbatim. The final segment carries no wildcard, so it is already case-sensitive on every host, which is the reduced
grammar's comparison rule as well. Nothing changes, on any tree, on any machine.

### B2 · `log-files`

|                   |                       |
| ----------------- | --------------------- |
| **Today**         | `fileName: log.md`    |
| **Proposed**      | `fileNames: [log.md]` |
| **Selects today** | 1 file                |
| **Verdict**       | **Exact**             |
| **Tokens**        | 1 → 1                 |

As B1. The two `fileName:` Rules are the only selectors in either config that survive the grammar change untouched —
which is unsurprising, since the reduced grammar's name axis was modelled on them.

### B3 · `provenance-exemplar`

|                        |                                                             |
| ---------------------- | ----------------------------------------------------------- |
| **Today**              | `path: [docs/research/provenance.md]`                       |
| **Proposed**           | `{ folders: [docs/research/], fileNames: [provenance.md] }` |
| **Second translation** | `{ fileNames: [provenance.md] }`                            |
| **Selects today**      | 1 file, under either                                        |
| **Verdict**            | **Exact** (for the chosen translation)                      |
| **Tokens**             | 1 → 2                                                       |

Two valid translations, identical today. The intersection is **chosen** because the old selector is a literal exact
path and the intersection reproduces it permanently rather than coincidentally.

The name-only translation is **rejected** on a consequence particular to this Rule's position. It sits deliberately
_above_ `research` in order to prove first-match ordering on real files. A second `provenance.md` appearing anywhere
in the corpus would be captured by a widened `provenance-exemplar` and stolen from whichever Rule should have had it —
turning a Rule whose stated intent is "the one document" into a Rule about a filename.

### B4 · `research` — include

|                   |                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Today**         | `path: [docs/research/**/*.md]`                                                                                  |
| **Proposed**      | `folders: [docs/research/, docs/research/vendor/]`                                                               |
| **Selects today** | 11 files — 8 won, 2 shadowed, 1 excluded                                                                         |
| **Verdict**       | **Approximate**                                                                                                  |
| **What it loses** | Recursion. A second vendored subfolder under `docs/research/` is reached by the glob and not by the folder list. |
| **Tokens**        | 1 → 2                                                                                                            |

`docs/research/vendor/` is listed in the **include** axis even though the exclusion immediately takes it back, because
that is what the glob does and the exclusion is what makes the removal visible. See B5.

### B5 · `research` — exclusion

|                       |                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------- |
| **Today**             | `excludeFiles: [docs/research/vendor/**]`                                           |
| **Proposed**          | `{ folders: [docs/research/vendor/] }`                                              |
| **Naive alternative** | `{ fileNames: [upstream.md] }`                                                      |
| **Third option**      | drop `docs/research/vendor/` from B4's include list and carry no exclusion at all   |
| **Selects today**     | 1 file — `docs/research/vendor/upstream.md`                                         |
| **Verdict**           | **Approximate**                                                                     |
| **What it loses**     | Recursion under `vendor/`. A file in a subfolder of `vendor/` stops being excluded. |
| **Tokens**            | 1 → 1                                                                               |

Folders alone, with no name axis, is the natural reading of a directory-contents glob and is the cheapest unit in
either config — the one place the reduced grammar is _shorter_ in spirit than the glob it replaces.

The naive name-only alternative is rejected for the reason given throughout this note.

The third option deserves its rejection spelled out, because it is behaviourally identical for `mh --check` and
therefore tempting. Under first-match an excluded file and an unselected file both fall through, and nothing below
`research` matches `vendor/upstream.md`, so both spellings leave it ungoverned. They differ in **`--audit`**:
`selectionFor` distinguishes `excluded` from `unselected` precisely so the audit can report them differently
(`src/packages/frontmatter-harness/lib/rules/selector.pure.ts:26-38`). Collapsing the exclusion would change the
audit report and erase the declared intent, for a saving of one token.

### B6 · `skills`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Today**                 | `path: [docs/skills/**/SKILL.md]`                                                                                       |
| **Translation by name**   | `fileNames: [SKILL.md]` ← **chosen**                                                                                    |
| **Translation by folder** | `{ folders: [docs/skills/, docs/skills/anonymous/, docs/skills/legacy/, docs/skills/writing/], fileNames: [SKILL.md] }` |
| **Selects today**         | 3 files, under either                                                                                                   |
| **Verdict**               | **Approximate**                                                                                                         |
| **What it loses**         | Containment. The chosen translation reaches `SKILL.md` anywhere in the corpus, not only under `docs/skills/`.           |
| **Tokens**                | 1 → 1 (chosen) · 1 → 5 (rejected)                                                                                       |

**This is the second ambiguity the epic names: a Rule selecting a named file under a subtree, with two valid
translations, identical today and divergent tomorrow.**

The name-only translation is chosen, and the reasoning is the exact mirror of A4 — which is why the two belong in one
note:

- This is an **include**. Widening an include makes _more_ files governed. A `SKILL.md` appearing under
  `docs/plain/` would be checked against the skills Rule rather than the plain Rule: a visible, arguable, reportable
  outcome. Nothing becomes invisible.
- Widening an **exclusion** (A4) makes files _ungoverned_, which is invisible by construction.

So the same widening is acceptable here and unacceptable there, and the deciding question is never "does this
translation widen" but "**does widening here make something invisible**".

Two supporting reasons. The folder translation goes stale on the single most likely edit to this corpus — adding a
skill — whereas the name translation does not, which is the epic's own stated consolation for enumeration staleness.
And a Rule about `SKILL.md` genuinely is a Rule about a filename; the folder list is an accident of where skills
happen to live.

The divergence is real and should be expected: a `SKILL.md` placed outside `docs/skills/` is matched by the chosen
translation and not by the rejected one. Under first-match it would be claimed by whichever of `research` or `skills`
comes first for that path. That is a behaviour change, deliberately accepted.

### B7–B10 · `reference`, `workflows`, `datasets`, `freshness`

| Rule        | Today                            | Proposed                     | Selects today | Verdict     | Tokens |
| ----------- | -------------------------------- | ---------------------------- | ------------- | ----------- | ------ |
| `reference` | `path: [docs/reference/**/*.md]` | `folders: [docs/reference/]` | 4 files       | Approximate | 1 → 1  |
| `workflows` | `path: [docs/workflows/**/*.md]` | `folders: [docs/workflows/]` | 5 files       | Approximate | 1 → 1  |
| `datasets`  | `path: [docs/datasets/**/*.md]`  | `folders: [docs/datasets/]`  | 2 files       | Approximate | 1 → 1  |
| `freshness` | `path: [docs/freshness/**/*.md]` | `folders: [docs/freshness/]` | 3 files       | Approximate | 1 → 1  |

Four Rules of one shape. Each names a flat folder with no subfolder today, so each translation is exact on the current
tree and loses only recursion. Each has one translation and no ambiguity — there is no shared basename to key on.

Each costs nothing in tokens and each goes stale the day a subfolder appears under its folder.

### B11 · `plain`

|                   |                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| **Today**         | `path: [docs/plain/**/*.md]`                                                                        |
| **Proposed**      | `folders: [docs/plain/, docs/plain/broken/]`                                                        |
| **Selects today** | 10 files — 8 won, 2 shadowed by `index-files`                                                       |
| **Verdict**       | **Approximate**                                                                                     |
| **What it loses** | Recursion. `docs/plain/broken/` must be named explicitly; a second subfolder would need naming too. |
| **Tokens**        | 1 → 2                                                                                               |

The only Rule in the Conformance config whose subtree is genuinely two levels deep, which is why it is the only one of
the flat-folder family that costs a token.

---

## The two ambiguities, stated on their own

Both are **invisible to a side-by-side comparison against today's tree**. Every translation in the tables above
selects exactly the set today's glob selects, including the ones that are wrong. A corpus comparison across the real
tree would pass all of them. That is why they are written out here rather than left to a diff.

### Ambiguity 1 · A name-only exclusion reaches the whole corpus

An exclusion written by file name alone selects that name **anywhere**. Where the old selector was a path matching one
file, the name-only translation selects the same one file today and widens the day a second file of that name appears
anywhere in the tree.

The damage is specific to first-match. A widened exclusion does **not** exempt the extra files from anything — it
makes them fall through, and if no Rule sits below, they land in **ungoverned**. A file that nothing checks is a worse
outcome than the one the exclusion was written to produce, and nothing reports it.

Affected units, with the exact translation given beside the naive one in each case: **A3** (`SPEC-v0.2.md`) and **A4**
(`raw.md`). A4 is the live hazard, because `raw.md` is the more plausible name to recur.

The rule this yields: **an exclusion is translated by intersection, never by name alone.**

### Ambiguity 2 · A named file under a subtree has two valid translations

A Rule selecting a basename beneath a subtree can be translated by folder list plus name, or by name alone. Both
select the same files today. They diverge the first time that basename appears outside the subtree.

Affected units: **B6** (`skills`, chosen by name) and **B3** (`provenance-exemplar`, chosen by intersection). They are
resolved in opposite directions on purpose, and the deciding question is the one stated in B6 — not whether the
translation widens, but whether widening makes something invisible.

---

## Enumeration cost, measured

Token counts under the definition given above.

### `markdown-harness.config.yaml`

| Unit                          | Today | Proposed | Δ       |
| ----------------------------- | ----- | -------- | ------- |
| A1 `vision`                   | 1     | 1        | 0       |
| A2 `docs-carry-a-type`        | 1     | 12       | **+11** |
| A3 exclusion · `SPEC-v0.2.md` | 1     | 2        | +1      |
| A4 exclusion · `raw.md`       | 1     | 6        | **+5**  |
| **Total**                     | **4** | **21**   | **+17** |

**4 → 21 tokens, a 5.25× growth.** Two Rules carry the whole cost, and both are the recursive ones.

### `fixtures/conformance/valid-test-config.yaml`

| Unit                     | Today  | Proposed | Δ      |
| ------------------------ | ------ | -------- | ------ |
| B1 `index-files`         | 1      | 1        | 0      |
| B2 `log-files`           | 1      | 1        | 0      |
| B3 `provenance-exemplar` | 1      | 2        | +1     |
| B4 `research` include    | 1      | 2        | +1     |
| B5 `research` exclusion  | 1      | 1        | 0      |
| B6 `skills`              | 1      | 1        | 0      |
| B7 `reference`           | 1      | 1        | 0      |
| B8 `workflows`           | 1      | 1        | 0      |
| B9 `datasets`            | 1      | 1        | 0      |
| B10 `freshness`          | 1      | 1        | 0      |
| B11 `plain`              | 1      | 2        | +1     |
| **Total**                | **11** | **14**   | **+3** |

**11 → 14 tokens, a 1.27× growth.**

### Both configs

**15 → 35 tokens, +20, a 2.33× growth.** Of 15 translation units, **4 are exact and 11 are approximate**; every
approximation loses recursion and nothing else.

The two totals are far apart and the difference is the finding. The Conformance config is a **flat corpus of many
shallow folders**, and the reduced grammar costs it almost nothing — three tokens across ten Rules. This repository's
own config holds **one catch-all over a deep tree**, and that single Rule is where eleven of the seventeen added
tokens land.

So the epic's premise that hand-translation is cheap **holds, with one qualification worth stating**: it is cheap per
Rule and expensive per catch-all. An Operator with a `docs/**/*.md` Rule over a deep tree is the Operator who feels
this, and there is exactly one such Rule in the repository — A2.

---

## Rules that go stale when a folder is added

Every unit below acquires a folder list that spans a subtree, and is therefore governed by nothing in any folder
created under it until an Operator edits the list. The tool says nothing. This is the accepted, named hole in the
epic; the list exists so that [#155](https://github.com/hancrafted/markdown-harness/issues/155) — the
ungoverned-folder report — has somewhere to start.

| Unit                    | Folder list spans       | Tokens today | Goes stale when                                |
| ----------------------- | ----------------------- | ------------ | ---------------------------------------------- |
| A1 `vision`             | `docs/vision/`          | 1            | any subfolder is created under `docs/vision/`  |
| A2 `docs-carry-a-type`  | all of `docs/`          | 12           | any folder is created anywhere under `docs/`   |
| A4 exclusion · `raw.md` | all of `docs/workshop/` | 5            | a new workshop session folder is created       |
| B4 `research` include   | `docs/research/`        | 2            | a subfolder is created under `docs/research/`  |
| B5 `research` exclusion | `docs/research/vendor/` | 1            | a subfolder is created under `vendor/`         |
| B7 `reference`          | `docs/reference/`       | 1            | a subfolder is created under `docs/reference/` |
| B8 `workflows`          | `docs/workflows/`       | 1            | a subfolder is created under `docs/workflows/` |
| B9 `datasets`           | `docs/datasets/`        | 1            | a subfolder is created under `docs/datasets/`  |
| B10 `freshness`         | `docs/freshness/`       | 1            | a subfolder is created under `docs/freshness/` |
| B11 `plain`             | `docs/plain/`           | 2            | a third folder appears under `docs/plain/`     |

**Ten of the fifteen translation units go stale on a folder addition.** A2 is the one that matters most: it is the
repository's catch-all, so a folder created under `docs/` produces files governed by nothing, which is the exact
failure `mh --check` exists to prevent.

Three units carry a folder axis and **do not** go stale, and the distinction is worth keeping: **A3** and **B3**
translate literal exact paths, so their folder token names a folder that must already exist and a new folder changes
nothing about them. **B1**, **B2** and **B6** carry no folder axis at all and reach new folders automatically — which
is the epic's stated consolation, visible here as three of fifteen units.

---

## What carries the corpus file extension

The epic requires this to be settled or recorded open. It is **settled for two commands and open for one**, and the
split is measured rather than reasoned.

### Settled — `--check` and `--audit`

Nothing is lost when `.md` leaves the selectors, because **the tree walk already carries the extension and always
has**. `isMarkdownFile` decides corpus membership from an entry's name alone, case-sensitively, at
`src/packages/markdown-file-tree/lib/corpus-entry.pure.ts:60-63`, from a `MARKDOWN_EXTENSION = '.md'` constant on line 22. Its own docblock states that it is "deliberately not a call to the platform matcher", for precisely the
host-independence reason the reduced grammar exists to serve.

So the `.md` written inside today's globs is **already redundant** on these two commands. Every path a selector is
ever offered by `--check` or `--audit` ends in `.md`, because the walk collected it. Removing the extension from the
selector language changes nothing an Operator can observe.

There is a second, independent confirmation in today's config: the Conformance exclusion `docs/research/vendor/**`
(B5) already carries **no extension**, and it behaves correctly. The walk is already the thing deciding.

### Open — `--query`

`--query` answers about a path **before anything exists there**, so no walk runs and `isMarkdownFile` is never
reached. Today the only thing carrying the extension on this path is the `.md` written inside the glob. Measured on
this repository's own config:

```
$ mh --query docs/research/does-not-exist.md    → "governance": "governed"
$ mh --query docs/research/does-not-exist.txt   → "governance": "invisible"
```

Under the reduced grammar, `docs-carry-a-type` becomes `folders: [docs/research/, …]` with no extension anywhere, so
**both queries would answer `governed`**. That is a real, measured behaviour change in a public, frozen response
field, and it is not covered by the settled half above.

**This is recorded as an open question for #159, not answered here.** The obvious repair is to route `--query`'s path
through `isMarkdownFile` before resolving Rules, which would restore today's answer exactly and put the extension in
one place for all three commands. That is a recommendation, not a decision — it touches the response contract, and
choosing it is #159's call, not this note's.

Whichever way it goes, #159 owes the specification one sentence saying **where** the corpus extension lives, since
after the grammar change it is nowhere an Operator can read it in their own config.

---

## What this note does not do

- **It edits no design record.** `docs/design-adr/0007-selector-is-two-literal-axes.md` does not exist yet, and
  `0005-host-dependent-glob-case-matching.md` is superseded by the implementation rather than by this note. Those
  amendments belong to [#159](https://github.com/hancrafted/markdown-harness/issues/159) and
  [#161](https://github.com/hancrafted/markdown-harness/issues/161).
- **It changes no config.** Both configs remain in the glob grammar. This note is the plan, not the edit.
- **It proves nothing mechanically.** #159 turns these tables into a measurement with the two-sided guard the epic
  describes: comparisons across the real corpus, plus **witness comparisons over paths that do not exist**. The
  witness half is the half that matters here — every wrong translation named in this note is invisible to a corpus
  comparison and obvious to a witness one.
- **It does not settle the interior-wildcard case.** Zero instances were measured in either config, consistent with
  the epic's own count.
