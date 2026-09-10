---
type: research
---

# Fiberplane Drift's Lockfile: What the Prior Art Gets Right About Recording a Binding

Research question, from [#97](https://github.com/hancrafted/markdown-harness/issues/97), a child of
[map #96](https://github.com/hancrafted/markdown-harness/issues/96): what does
[Fiberplane Drift](https://github.com/fiberplane/drift)'s binding record actually contain, and which of
its choices should `citation-binding-via-hash` — the map's first `drift-detection` mechanism — borrow,
reject, or borrow with modification? Drift is prior art only; the map has already ruled it out as a
dependency (#96, Out of scope). This surveys the source and docs, without installing, running, or
depending on it, and pays particular attention to four questions the ticket names directly:

1. **One root lockfile vs. one ledger per document.** The map has already chosen per-document. Did
   Drift hit the merge-conflict problem a single root file predicts, and is there evidence either way
   in its issues?
2. **The `origin` key.** Does an equivalent problem exist here — a citation pointing outside the
   governed corpus?
3. **Whether `drift link` re-stamping via the agent skill collapses enrol and re-vouch.** The map
   deliberately separates them; does Drift, and what does that cost it?
4. **The normalisation boundary.** Node kinds plus token text is a deliberate choice about what counts
   as a change. What is the markdown analogue, and what does Drift's choice fail to notice?

Probed 2026-09-10. Every claim below is either **[source-read]** — read directly from Drift's own
source or design docs, pinned to a commit SHA, on this date — or **[inferred]** — my own reasoning
about how that evidence bears on the map, not a claim Drift's authors make themselves. Volatile facts
(stars, open-issue counts, release dates) are stamped with the date they were fetched, since they will
have moved by the time anyone reads this. Nothing here was installed, built, or run; the tool was read
only through `raw.githubusercontent.com` file fetches and the GitHub API, satisfying #97's "prior art
only" constraint.

---

## 0. Sources and versions probed

| Source | Role | Pin |
| --- | --- | --- |
| [fiberplane/drift](https://github.com/fiberplane/drift) | the subject | commit [`fc90540`](https://github.com/fiberplane/drift/commit/fc90540acb1a3f15ab3c90b4c8c9bac16c7a6522), `main` HEAD as of 2026-09-10; tagged `v0.10.1`, released 2026-06-22 |
| `README.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/CLI.md`, `docs/CONCURRENCY.md`, `.claude/skills/drift/SKILL.md`, `CLAUDE.md` | prose/spec sources | same commit |
| `src/lockfile.zig`, `src/target.zig`, `src/symbols.zig`, `src/markdown.zig`, `src/vcs.zig`, `src/main.zig`, `src/commands/link.zig`, `src/commands/lint.zig` | implementation sources, read to verify or correct the prose | same commit |
| `test/property/*` (the `minish` property-test suite) | evidence for the merge-conflict claims in §3 | same commit |
| [`tree-sitter-grammars/tree-sitter-markdown`](https://github.com/tree-sitter-grammars/tree-sitter-markdown) | the markdown grammar Drift vendors as a lazy build dependency (`build.zig.zon`) | commit [`f969cd3`](https://github.com/tree-sitter-grammars/tree-sitter-markdown/commit/f969cd3ae3f9fbd4e43205431d0ae286014c05b5), package `v0.5.3` |
| Issues [#15](https://github.com/fiberplane/drift/issues/15), PRs [#29](https://github.com/fiberplane/drift/pull/29), [#30](https://github.com/fiberplane/drift/pull/30), [#31](https://github.com/fiberplane/drift/pull/31), [#19](https://github.com/fiberplane/drift/pull/19) | the lockfile-format history, read for evidence on Q1 and Q3 | bodies fetched via `gh api`, all merged/closed before 2026-06-22 |
| `gh api repos/fiberplane/drift` | repo metadata | fetched 2026-09-10: **144 stargazers, 4 forks, 6 open issues**, MIT license, `pushed_at` 2026-06-22T14:14Z |

Drift's own `CHANGELOG.md` (not fully current past ~v0.7.0 in the copy fetched) dates the lockfile's
introduction to v0.7.0 (2026-04-08); content-addressed `sig` provenance to v0.5.0 (2026-03-30);
origin-qualified anchors to v0.6.0; `check` was added as an alias of the original `lint` command in
v0.3.0 (2026-03-04) — `lint` is the older name, `check` the newer, contrary to how the ticket's fact
sheet lists them (`check, status, link, unlink, refs, lint`, implying `check` is primary). Cosmetic, but
worth a note since the ticket's own phrasing suggested `check` was original.

---

## 1. Summary — the answers

**Fact-check on the ticket's starting facts, before the verdicts.** Two of the seven "known starting
facts" needed correcting, not just deepening:

- **"Git is consulted solely for blame annotation" is wrong.** [source-read] `docs/CONCURRENCY.md:39`
  states plainly that `discoverDocGroups` shells out to `git ls-files` (to enumerate candidate docs) and
  `vcs.getRepoIdentity` shells out to `git remote get-url origin` (to resolve the `origin`-key identity
  in §4 below) — both at the top of every `lint` run, run concurrently as a deliberate latency
  optimization. Git is used for at least three purposes: doc discovery, origin-identity resolution, and
  blame. Only the *staleness comparison itself* — recomputing a `sig` and diffing it against the stored
  value — is git-free (`docs/DECISIONS.md` Decision 4: "`drift lint` with `sig` provenance never shells
  out to git for staleness"). See §5 for why this distinction matters to the map's own hermetic-path
  decision.
- **"`sig` is a 16-hex XxHash3 over a tree-sitter-normalised AST" is only true for code, and Drift's own
  design doc overstates how true it is for markdown.** [source-read] `docs/DESIGN.md:206` claims
  doc-to-doc heading anchors "hash the section's normalized syntax tree" — but the actual
  implementation (`src/markdown.zig:52-53,80-85`) computes a raw `XxHash3` over the section's byte
  range, with no call anywhere into the node-kind-plus-token-text traversal (`hashNormalizedNodeSyntax`,
  `src/symbols.zig:84-100`) that code anchors get. This is this research's single most important
  finding; it is the whole answer to Q4, and it means Drift has **no shipped, working example** of a
  reflow-invariant markdown hash to borrow — despite its own docs implying one exists. See §6.
- A smaller, lower-stakes correction: the inline `@./src/auth/provider.ts#AuthConfig` reference form is
  **documented as auto-discovered by `drift link` but is not, in the current source, actually
  discovered**. `README.md:52,84` both claim `drift link` will "stamp" inline references it finds in a
  doc's body; `.claude/skills/drift/SKILL.md:56` directly contradicts this for the common case: "Current
  `drift link <doc-path>` blanket mode does not discover or add inline `@./` references from the doc
  body." A GitHub code search across the whole repository for the literal string `@./` and for the
  identifier `extractInlineReferences` returns hits only in the two prose files above — never in a
  `.zig` source file. The feature is aspirational prose, not shipped behaviour, as of `fc90540`.

**Q1, one root lockfile vs. one ledger per document — borrows a technique, doesn't borrow the
architecture, and the evidence strongly favours the map's choice.** Drift shipped a single root
`drift.lock` and hit exactly the conflict problem a shared file predicts: issue
[#15](https://github.com/fiberplane/drift/issues/15) accepted the tradeoff going in ("Lockfile is
another merge surface, though it's deterministically generated so conflicts are mechanical"), and the
measurement branch [#31](https://github.com/fiberplane/drift/pull/31) later quantified it — **~40%
spurious `git merge-file` conflict rate on the original line-based format across 400 trials, falling to
a 25-31% floor after switching to canonically-sorted TOML**, which the branch's own author calls
structural ("two inserts at the same sort anchor are unfixable without semantic merge"). Drift never
tested a one-file-per-document sharding; every variant in #31 (V0 through V10) is still a single root
file. So there is no *direct* Drift evidence comparing the two architectures — but the *indirect*
evidence is unusually strong: even Drift's best-tuned single-file mitigation (canonical serialization,
sorted blocks, sorted metadata keys) tops out with roughly a quarter of *disjoint* edits still
conflicting, because any two documents' bindings share one file and one sort order. Splitting into a
ledger per document, as the map has already done, removes the entire class of cross-document conflicts
Drift's own numbers show it could not engineer its way out of — leaving only the narrower, rarer case of
two concurrent edits to the *same* document's own ledger, which is where Drift's canonicalization
technique remains directly worth borrowing. **Borrow the technique (canonical serialization: sort
binding blocks by a stable key, sort metadata fields by key, one block of text per binding) inside each
per-document ledger; reject the single-root-file architecture the map has already rejected — Drift's own
data explains why.** See §3.

**Q2, the `origin` key.** The equivalent problem is real for `markdown-harness` too — a shared skill
file, a vendored doc, or a copied template can carry a citation whose target lives in a different
repository than the one currently checking it — and Drift's fix (an opt-in `origin = "github:owner/repo"`
metadata field, compared against `git remote get-url origin` at check time, silently skipped rather than
reported when it doesn't match) is a reasonable shape to **borrow with modification**. The modification
matters: Drift's origin resolution is GitHub-specific and fails closed in a way that silently *widens*
what gets skipped — `src/vcs.zig:265-293`'s `normalizeGitHubUrl` recognizes only `git@github.com:`,
`https://github.com/`, and `ssh://git@github.com/` remote shapes and returns `null` for anything else
(GitLab, Bitbucket, a bare local path, no remote at all); and `src/commands/lint.zig:365-366` then
treats an unresolvable local identity as "not local," so *every* origin-tagged anchor is skipped whenever
the identity can't be resolved, not just the ones that are genuinely foreign. A GitLab-hosted repo with
no GitHub remote would see 100% of its origin-tagged anchors silently skipped, which is a false negative
Drift's own design accepts as the price of false positives elsewhere (`docs/DECISIONS.md` Decision 10).
Whatever the map does with an equivalent concept, this asymmetry — unresolvable identity fails toward
silence, not toward checking — should be a conscious choice, not an accident of implementation, and the
underlying comparator should not be tied to one host. See §4.

**Q3, does `drift link` re-stamping collapse enrol and re-vouch — no, and the mechanism is worth
borrowing directly.** [source-read] `src/commands/link.zig:131-139`'s `isDocGateBlocked` is the entire
gate, and it is exactly the asymmetry the map's Notes already specify: a binding with `old_sig == null`
(never seen before) is never blocked — it enrols freely, no human involved. A binding whose stored `sig`
differs from the freshly computed one *is* blocked, unconditionally, unless the caller passes
`--doc-is-still-accurate` (or, interactively, answers `y` to a TTY prompt printed by
`promptDocAccurate`, `src/commands/link.zig:114-127` — in non-TTY / agent contexts this path is always
refused, never auto-confirmed). The agent skill (`SKILL.md`) documents the *workflow* around this gate
— attempt, get refused with a printed diff of both sides, read the doc, edit it, retry with the flag —
but the skill is a wrapper around a gate the binary itself enforces; nothing in the skill or the CLI
re-stamps a changed binding without that explicit flag. This is, functionally, exactly the map's
"enrol automatically, re-vouch only by hand" rule, independently arrived at and independently enforced
in the tool rather than only in the agent's instructions. **Borrow the gate as a load-bearing invariant
in code, not merely as skill-level instruction to a cooperative agent** — Drift's version does not trust
the agent to remember the rule; it makes violating it structurally require an explicit, named flag. See
§5.

**Q4, the normalisation boundary — the concept is worth borrowing, but Drift ships no working markdown
implementation of it to copy.** Code anchors hash a preorder AST traversal keyed by `node.kind()` plus,
at leaf nodes only, the raw token bytes (`src/symbols.zig:76-100`) — this is genuinely reflow-invariant
for the six supported languages, because whitespace and layout never appear as their own node kind or
token. Markdown anchors do not get this treatment: both whole-document and heading-section markdown
fingerprints are a raw byte hash of the (structurally-located, but not structurally-hashed) span
(`src/markdown.zig:52-53,80-85`), despite `docs/DESIGN.md:206` describing the heading case as hashing
"the section's normalized syntax tree." Confirmed by reading the actual `tree-sitter-markdown` grammar
Drift vendors: had Drift's own code-hashing recipe been ported to markdown verbatim, it would *still*
not be reflow-invariant for at least two common cases — switching a bullet's marker character
(`-`/`+`/`*`) changes the block grammar's *node kind* itself (`list_marker_minus` vs. `list_marker_plus`
vs. `list_marker_star`, `tree-sitter-markdown/grammar.js:324-358`), and switching an emphasis delimiter
(`*text*` vs. `_text_`) changes the *leaf token bytes* even though the inline grammar aliases both
delimiter tokens to one shared node kind, `emphasis_delimiter`
(`tree-sitter-markdown-inline/grammar.js:402-405`). A direct port of "node kind plus token text" to
markdown would flag both of those as content changes, which is exactly the reflow noise the map's
"normalisation is forced, not chosen" note is trying to avoid. **Borrow with modification: the
node-kind-plus-token-text idea is the right shape for a reflow-invariant hash, but it needs markdown-
specific trivia handling — treating marker-character and delimiter-character choice as normalized-away,
not as structure — that Drift has not built and does not need to build, because it never actually
applies the technique to markdown in the first place.** See §6.

---

## 2. What `drift.lock` actually records

A binding is a TOML `[[bindings]]` table with a mandatory `doc` and `target` and free-form metadata
string fields, of which `sig` is the one that matters for staleness (`docs/DESIGN.md:223-244`,
`src/lockfile.zig`'s `Binding`/`Lockfile` types). `target` is parsed by splitting on the first `#`
(`src/target.zig:19-24`): the part before is a repo-relative file path, the part after (if present) is a
symbol or heading name. `ParsedTarget.isHeading()` (`src/target.zig:8-10`) is true exactly when there
*is* a `#`-suffix and the file extension is `.md` — Drift's own code treats "this points at a markdown
heading" as a special case of "this points at a symbol," not a separate target kind, which is a modest
but genuine precedent for the map's own "section identity is the closest enclosing heading" choice (#96
Notes) — Drift independently arrived at heading-as-symbol.

`drift link <doc> [<target>]` writes or refreshes a binding and stamps its `sig` from whatever is
currently on disk (`README.md:47-53`); `drift check`/`drift lint` (aliases of the same handler,
`src/main.zig`) recompute every stored binding's `sig` and diff, exiting 1 on any mismatch
(`docs/CLI.md:5-9`). `drift status`, `drift refs`, `drift unlink` round out the CLI as inspection and
removal commands; none of them recompute or re-stamp. The reason-code taxonomy Drift reports
(`src/commands/lint.zig:52-63`) is `changed_after_baseline`, `file_not_found`, `file_not_readable`,
`symbol_not_found`, `fingerprint_unavailable`, `baseline_unavailable`, `origin_mismatch`,
`link_target_not_found` — worth noting for the map's own "how a drift finding ... collapses into one
reported answer" open question (#96, Not yet specified): Drift keeps "target's content changed" and
"target no longer exists" and "target belongs elsewhere" as three visibly different reasons rather than
folding them into one boolean, and that granularity is presumably part of why the tool is legible.

One structural point the ticket's fact sheet does not mention and that bears directly on the map's
"symmetric recording, one-directional reporting" decision: **Drift's `sig` only ever fingerprints the
target side of a binding.** There is no field anywhere in `Binding` that records a signature of the
*citing document's own prose* around the anchor. This means Drift's data model cannot represent "the
citer was rewritten but the target didn't move" as a distinct case from "nothing changed" — it has no
way to see the citing side move at all. The map's decision to store both sides but report on only one
is a strictly richer model than what Drift ships; Drift doesn't collapse the two directions the way the
map worries an unconsidered design might, it simply never modeled the second direction in the first
place. [inferred] This is not evidence against the map's choice — if anything it is a reminder that the
"collapse" failure mode the map is guarding against is a real and easy mistake to make by omission, not
just by an explicit design shortcut.

---

## 3. Q1 — one root lockfile vs. one ledger per document

Drift's lockfile started, and remains, a single `drift.lock` at the repo root (`docs/DECISIONS.md`
Decision 3, Decision 13 — lockfile discovery walks up from cwd, `drift.lock` itself is the project-root
marker). The original proposal, issue [#15](https://github.com/fiberplane/drift/issues/15), named the
merge-conflict risk in its own tradeoffs section before anyone had measured it: *"Lockfile is another
merge surface, though it's deterministically generated so conflicts are mechanical."* That framing —
"mechanical," implying resolvable-by-tooling rather than a real cost — turned out to be optimistic. PR
[#29](https://github.com/fiberplane/drift/pull/29) fixed a bug where "equivalent metadata could be
written in different field orders depending on how a binding was built," which the PR description says
"created avoidable textual merge conflicts" even for genuinely non-conflicting semantic states; it adds
a `minish`-based property test asserting `semantic_eq(L1, L2) ⟹ serialize(L1) == serialize(L2)`, i.e.
canonical serialization order is treated as a correctness property, not a style preference.

The real measurement is in PR [#31](https://github.com/fiberplane/drift/pull/31), explicitly marked "do
not merge — measurement harness only." It built a `git merge-file` oracle over randomized disjoint-edit
scripts against several lockfile format variants (the original one-line format, and ten TOML/YAML/
INI-style variants, V0-V10) and reports, verbatim from the PR body: **"~40% disjoint edits on the
original line-based format produced spurious git conflicts. 0 silent corruptions across 400 trials,"**
with multi-line/TOML variants clustering "25-31%," and: **"Floor is structural (two inserts at the same
sort anchor are unfixable without semantic merge)."** Among the TOML shapes, "grouped narrowly wins on
merge rate (~25.0% vs ~25.2% flat) but gap [is] within noise," and the flat `[[bindings]]` shape was
chosen for PR [#30](https://github.com/fiberplane/drift/pull/30) — the actual format switch — "for
simpler deserialize, easier to evolve forward," not because it measurably won on conflicts.

Two things follow. First, the predicted problem is real and was directly measured, not merely
speculated about — Q1's premise is fully confirmed by Drift's own history, at a precision (40% → 25-31%,
400 trials) the map did not have before this research. Second, Drift never tried the fix the map has
already chosen: sharding the lockfile by document. All ten measured variants in #31 remain single root
files; the entire measurement campaign optimizes serialization *within* one shared file, not around
removing the sharing. That means there is no Drift number to cite as "one ledger per document measured
at X% conflict rate" — but the number that *does* exist implies the shape of the answer: a residual
conflict floor caused by two edits landing at "the same sort anchor" in one file is, almost by
definition, eliminated for any two edits that land in two different documents' own separate files, since
those files don't share a sort order or a diff region at all. The map's one-ledger-per-document choice
sidesteps the exact failure mode Drift's canonicalization work could not fully engineer around.
[inferred — Drift provides the base rate and the mechanism of the residual floor; the extrapolation to
"a per-document split removes most of that floor" is this research's reasoning, not a number Drift
measured.] The part of Drift's fix that *does* transfer directly to a per-document ledger is the
technique, not the architecture: canonical serialization (stable key order for metadata fields,
`src/lockfile.zig:198-209`; a stable sort of rendered blocks, `src/lockfile.zig:250-278`) still matters
inside a single document's own ledger, whenever two branches touch different bindings for the *same*
document concurrently — which per-document sharding does not eliminate, only shrinks the exposure to.

No open issue on `fiberplane/drift` (6 open as of 2026-09-10) currently revisits the lockfile format or
raises merge conflicts as an unresolved problem; the topic reads as settled by #29/#30/#31 within the
repo's own history, not as an ongoing pain point.

**Verdict: borrow the canonicalization technique (stable sort order for blocks and metadata fields,
proven by property test rather than by convention); reject the single-root-file architecture, which the
map has already rejected on grounds Drift's own data corroborates rather than contradicts.**

---

## 4. Q2 — the `origin` key and the governed-corpus analogue

Drift's `origin` field is a per-binding TOML string, `origin = "github:owner/repo"`
(`docs/DESIGN.md:43-60`). At check time, `getRepoIdentity` (`src/vcs.zig:296-320`) runs
`git remote get-url origin`, and `normalizeGitHubUrl` (`src/vcs.zig:265-293`) canonicalizes it to the
same `github:owner/repo` shape — recognizing exactly three URL forms (`git@github.com:owner/repo[.git]`,
`https://github.com/owner/repo[.git]`, `ssh://git@github.com/owner/repo[.git]`) and returning `null` for
anything else, including any non-GitHub host. `src/commands/lint.zig:365-366` then compares: `is_local`
is true only if a repo identity was resolved *and* it string-equals the anchor's `origin`; if not, the
anchor's outcome is `.skip` with reason `origin_mismatch` — deliberately not reported as `STALE`, to
avoid the false "file not found" noise a vendored or shared doc would otherwise generate
(`docs/DECISIONS.md` Decision 10, `README.md:97-112`). The mechanism exists because docs travel:
installed skills, vendored documentation, monorepo imports all carry anchors whose targets live in the
*source* repo, not whatever repo is currently checking them, and without this, every one of those
anchors would read as broken every time.

`markdown-harness` has the same shape of problem, even though the map's own docs (`docs/vision/product.md`,
`docs/vision/architecture.md`) don't yet name it directly — grepped for vendor/distribute/skill-travel
language and found essentially nothing on point beyond a passing mention of interactive vs. non-interactive
skill usage (`docs/vision/architecture.md:104`), which is not about doc distribution. [inferred] A shared
skill's `SKILL.md`, or a template doc copied into a consumer's repo, is exactly Drift's scenario: a
citation whose target is correct relative to the repo it was authored in, and meaningless relative to
the repo it now sits in. If the map's binding model ever needs to support a document that isn't wholly
local to the repo currently checking it — which is plausible given `markdown-harness` itself ships
skills other repos install — an origin-equivalent concept will be needed for the same reason Drift built
one: to distinguish "this target doesn't exist, someone broke it" from "this target was never meant to
resolve here."

The part worth explicit modification, not blind adoption, is the failure direction when identity can't
be resolved at all. Because `is_local` defaults to `false` whenever `repo_identity` is `null`
(no remote, a non-GitHub remote, or `git remote get-url origin` failing for any reason), an origin-
tagged anchor in a repo Drift can't identify is *always* skipped — never checked, never reported stale —
which is a silent false negative, not merely the silent false positive the feature was built to avoid.
A GitLab or Bitbucket repo, or one with no remote configured (a fresh local clone before `git remote
add` is run), gets none of its origin-tagged anchors checked at all under Drift's current logic. Whether
that tradeoff is acceptable depends entirely on how common "origin set, identity unresolvable" is
expected to be; Drift's own code doesn't reason about it explicitly, it's a fall-through of `if (repo_
identity) |ri| ... else false`. Borrowing the *shape* of the mechanism (an opt-in field, compared against
resolved local identity, mismatch means skip-not-fail) is sound; borrowing the GitHub-only comparator and
its silent-skip-on-unresolvable behaviour verbatim would import a narrower and more silent failure mode
than the map may want.

**Verdict: borrow with modification — keep the opt-in skip-on-mismatch shape, generalize the identity
comparator beyond one host, and decide deliberately (rather than by fall-through) what happens when
local identity can't be resolved at all.**

---

## 5. Q3 — does `drift link` re-stamping collapse enrol and re-vouch?

No — and the separation is enforced in the binary, not left to the agent skill's good behaviour. The
whole gate is `isDocGateBlocked` (`src/commands/link.zig:131-139`):

```zig
fn isDocGateBlocked(
    binding: *lockfile.Binding,
    old_sig: ?[]const u8,
    doc_is_still_accurate: bool,
) bool {
    if (doc_is_still_accurate) return false;
    const os = old_sig orelse return false;
    const ns = binding.fieldValue("sig") orelse return true;
    return !std.mem.eql(u8, os, ns);
}
```

Read the three branches as the three cases the map's own "enrol automatically, re-vouch only by hand"
rule needs to distinguish: `old_sig == null` (line 2) is a binding that has never been stamped before —
`isDocGateBlocked` returns `false` unconditionally, so first-time enrolment is never gated, regardless
of `--doc-is-still-accurate`. `old_sig` present and unchanged (`std.mem.eql` true) means the gate also
returns `false` — a no-op re-stamp of a target that hasn't moved needs no confirmation, correctly. Only
the third case — `old_sig` present *and* different from the freshly computed value — returns `true`
unless the caller passed `doc_is_still_accurate`, at which point it's forced to `false` by the first
line regardless of what changed. This is a strict, source-level implementation of exactly the rule the
map's Notes state in prose: new pairs enrol freely; existing pairs never silently refresh past a real
divergence.

The confirmation path itself has two entries — a `--doc-is-still-accurate` CLI flag, checked by both the
targeted-anchor path (`src/commands/link.zig:50,61`) and the whole-doc blanket path
(`src/commands/link.zig:81,90`); and, only in an interactive TTY, a `[y/N]` prompt
(`promptDocAccurate`, `src/commands/link.zig:114-127`) that falls through to an unconditional refusal —
printed to stderr, no prompt — whenever `stdin.isTty(io)` is false. That non-TTY branch is the one that
matters for an agent: in exactly the context the map is worried about (an automated stamper acting on a
commit or a CI run, not a human at a keyboard), Drift's own tool refuses to re-vouch, full stop, with no
flag an unattended process would plausibly pass on its own. `--doc-is-still-accurate` reads as a
deliberately human-shaped gesture — it asserts a claim about a document's *prose*, not about its
mechanics, which is not something a diffing tool can verify for itself and not something Drift's design
tries to let an agent assert automatically.

The agent skill (`.claude/skills/drift/SKILL.md`) documents the workflow around this gate rather than
weakening it: attempt `drift link`, get refused with printed dual context (`printStaleContext` /
`printBlanketRefusal`, added in PR [#19](https://github.com/fiberplane/drift/pull/19) — "Relink gate:
refuse `drift link` on stale anchors unless explicitly reviewed"), read the doc section and the current
target side by side, edit the doc's prose, then retry with `--doc-is-still-accurate`. The skill's job is
to teach an agent *how* to satisfy the gate, not to bypass it — the gate itself lives in `link.zig`, so
even an agent that ignores the skill's instructions and calls `drift link` directly hits the same
`isDocGateBlocked` check.

One genuine cost, visible in the skill doc itself: `SKILL.md:56` states plainly that blanket `drift link
<doc-path>` "does not discover or add inline `@./` references from the doc body" — so an agent following
only the happy path (blanket relink after an edit) will silently fail to pick up a *new* citation added
inline in prose; it has to be added explicitly with `drift link <doc-path> <target>`. That's a workflow
gap, not a gate-collapse — it doesn't let a stale binding re-vouch itself, it just means new bindings
require a more deliberate command than the docs' own examples suggest.

**Verdict: borrow directly.** The `isDocGateBlocked` state machine — enrol unconditionally on `old_sig
== null`, no-op on unchanged `sig`, block on changed `sig` unless an explicit human-shaped flag is
present, and refuse rather than prompt in any non-interactive context — is a close, independently-
derived match for the map's own rule, enforced at the tool level rather than left to agent discipline.
That last property (enforced in code, not just in an agent's instructions) is the part worth being
deliberate about copying: whatever stamps bindings in `markdown-harness` should make "refresh an existing
pair without review" structurally require the same kind of explicit, nameable flag, not merely document
that an agent shouldn't do it.

---

## 6. Q4 — the normalisation boundary, and markdown's gap

For the six supported code languages (`.ts/.tsx/.js/.jsx`, `.py`, `.rs`, `.go`, `.zig`, `.java` —
`src/symbols.zig:22-75`), a fingerprint is computed by `hashNormalizedNodeSyntax`
(`src/symbols.zig:84-100`), a recursive preorder walk: every node contributes its `node.kind()` string,
tagged and length-prefixed (`hashTaggedBytes`, `src/symbols.zig:76-83`); a node with children recurses
into *all* of them (`node.childCount()`, not just named children); a leaf node (`childCount() == 0`)
additionally contributes the raw source bytes for its own span. No byte position, no whitespace, no
comment-vs-code distinction is hashed *as* whitespace — comments are still leaf nodes with their own
kind and are hashed like any other token, so this is reflow-invariant for indentation and line-wrapping,
but it is not comment-blind. This is exactly what the ticket's fact sheet describes, and it holds up
against the source precisely.

Markdown does not get this treatment, and the gap between what Drift's own docs say and what it does is
the central finding here. `docs/DESIGN.md:206` lists, as one of three fingerprint tiers: *"Heading-level
(doc-to-doc): parse markdown with tree-sitter, find heading via block grammar's `section`/`atx_heading`
nodes, hash the section's normalized syntax tree."* And `docs/DESIGN.md:81` describes doc-to-doc anchors
as working "the same way" as symbol anchors. Neither statement matches `src/markdown.zig`:

```zig
pub fn fingerprintDocumentSyntax(source: []const u8) ?u64 {
    return fingerprintBytes(source);
}
```

```zig
pub fn fingerprintHeadingSection(source: []const u8, heading_fragment: []const u8) ?u64 {
    const block_tree = parseBlockTree(source) orelse return null;
    defer block_tree.destroy();
    const section = findHeadingSection(block_tree.rootNode(), source, heading_fragment) orelse return null;
    return fingerprintBytes(source[section.startByte()..section.endByte()]);
}
```

`fingerprintBytes` (`src/markdown.zig:236-240`) is a plain `XxHash3` over raw bytes — the same fallback
`computeFingerprint` (`src/symbols.zig:180-197`) uses for a file extension it doesn't recognize at all.
Tree-sitter markdown *is* used here — `parseBlockTree` and `findHeadingSection` genuinely walk the
`section`/`atx_heading`/`setext_heading` nodes to *locate* the byte range a heading's section occupies —
but that structural walk only finds the boundary; the content inside it is hashed as opaque bytes, never
as the `hashNormalizedNodeSyntax` traversal the code-language path uses. A grep across `markdown.zig` for
either `hashNormalizedNodeSyntax` or `fingerprintNodeSyntax` (the two functions that implement AST
normalization) returns zero matches. Markdown sits in an unusual middle ground: structurally aware for
*finding* the span, but byte-literal for *hashing* it — closer, in the part that actually determines
staleness, to the "unsupported language, raw content fallback" tier than to the reflow-invariant tier
its own design doc describes it as belonging to.

Practically, that means every markdown-to-markdown or file-level markdown anchor in Drift is sensitive to
pure reformatting today: reflowing a paragraph, changing list-marker style, re-indenting, or normalizing
line endings inside a bound section all change the hash, exactly the noise the map's "normalisation is
forced, not chosen" note (#96) is trying to avoid by requiring a markdown-parser dependency in the first
place. Drift's own experience is therefore not a working example to copy for this specific piece — it is
evidence that the problem is real enough that even a project built around AST-normalized hashing did not
solve it for its own markdown case.

The ticket asks specifically what a hypothetical direct port of "node kinds plus token text" would miss
for markdown, and the answer is verifiable from the grammar Drift itself vendors
(`tree-sitter-grammars/tree-sitter-markdown@f969cd3`), not merely assumed. Two concrete failure modes:

- **List-marker style is a node-kind difference, not just a token-text difference.** The block grammar
  defines separate named rules per marker character —
  `list_marker_plus`, `list_marker_minus`, `list_marker_star`, `list_marker_dot`,
  `list_marker_parenthesis` (`tree-sitter-markdown/grammar.js:324-358`). Changing a list from `-` to `*`
  bullets changes `node.kind()` itself for every marker node in the list, which a direct port of
  `hashNormalizedNodeSyntax` would hash into the internal-node tag at every level — a cosmetic change
  registering as a structural one.
- **Emphasis-delimiter style survives node-kind unification but not token-text.** The inline grammar
  defines separate internal tokens `_emphasis_open_star` / `_emphasis_open_underscore` (and their close
  counterparts), then unifies them via `alias()` into one exposed node kind — e.g.
  `alias($['_emphasis_star' ++ suffix_link], $.emphasis_delimiter)` and the equivalent underscore rule
  (`tree-sitter-markdown-inline/grammar.js:402-405`). So `*text*` and `_text_` *do* produce the same
  node kind, but the delimiter is still a leaf node, and `hashNormalizedNodeSyntax`'s leaf branch hashes
  raw token bytes — `*` and `_` differ at that byte level even when the surrounding node kind is
  identical. The grammar's own aliasing solves half the problem (kind) and leaves the other half (text)
  exactly where a naive port would still flag it.

Heading style is a third, simpler case, already visible in Drift's own code rather than requiring a
grammar read: `atx_heading` (`# Heading`) and `setext_heading` (`Heading\n===`) are distinct node kinds
(`src/markdown.zig`'s own heading-walking code checks both by name), so a style switch between the two
would also register as structural under a direct port.

**Verdict: borrow with modification.** The concept — normalize away layout, keep structure and token
identity — is the right shape for a reflow-invariant markdown hash, and it is worth building. But there
is no working Drift implementation of it to adapt; what Drift ships for markdown is a raw-byte hash that
happens to reuse tree-sitter only for locating section boundaries, not for normalizing their content, despite
its own design doc describing the two code paths as symmetric. Any markdown-specific hash the map builds
will need to decide, explicitly, how to treat "trivia" node kinds whose *identity* (not just their text)
encodes a purely stylistic choice — list-marker character being the clearest example verified here — since
a bytes-in-node-order hash of the normalized tree is not automatically reflow-invariant the way it is for
prose-free code syntax.

---

## 7. Other observations bearing on the map, not directly asked

**Broken-link detection is a second, independent mechanism, decoupled from the `sig`-based staleness
check.** `docs/DESIGN.md:83-95`: any relative markdown link is checked for existence during `drift
lint`, using the same tree-sitter parse that resolves doc-to-doc anchors — but it requires no `drift.lock`
entry at all, and reports `BROKEN` rather than `STALE`. This is a clean structural separation between
"does the citation still point at something that exists" and "has the thing it points at changed," which
maps loosely onto the map's own distinction between a target that moved (file not found — an existence
question) and a target whose content changed (a `sig` mismatch — a staleness question); Drift keeps these
as genuinely different reason codes rather than merging them (§2 above), which is a reasonable precedent
if the map's own "how a drift finding ... collapses into one reported answer" question (#96, Not yet
specified) ends up wanting more than one axis.

**The `.drift/config.yaml` opt-in scan config is a weaker mechanism than the map's Rule-based opt-in,
not a stronger one.** `docs/DESIGN.md:252-268` — Drift's include/exclude globs govern which files get
*scanned for candidacy*, but the actual governing relationship is still "has at least one binding in
`drift.lock`," which is closer to the map's own `Governed file` definition (a file matched by at least
one Rule) than to a separate config layer. Nothing here contradicts the map's "opt-in is by path, and
already exists" decision; it's a parallel confirmation that a scan-scope-plus-membership-test design is
common enough to be closer to convention than to invention.

**`.drift/config.yaml`'s `vcs: auto | git | jj` knob, and `src/vcs.zig`'s `detectVcs()`, are currently
hardcoded to always return `.git`** — the jj branch exists in the type but is disabled in the function
body, per the source read. Not itself a finding about the map, but worth noting for calibration: Drift's
own "auto-detected VCS" claim in its docs is, like the markdown-normalization claim, ahead of what the
code currently does. Two doc/code gaps in one small codebase in one afternoon of reading is a mild signal
to keep verifying Drift's prose against its source rather than trusting either alone, if this repo comes
back to Drift as prior art again later.

---

## 8. What could not be established

- **Whether the ~40%/25-31% conflict-rate numbers from PR #31 are reproducible outside Drift's own
  synthetic edit-script generator.** The measurement harness (`test/property/*`, gated on
  `-Dformat-experiment=true`) was read, not run — per #97's hard constraint against installing or
  running Drift — so these figures are reported as Drift's own stated result, not independently
  reproduced. The PR body is explicit about its own methodology (randomized disjoint edits, a
  `git merge-file` oracle, 400 trials, a fixed `minish` seed), which is enough to trust the shape of the
  finding, but the exact numbers should be read as "what Drift measured," not as a rate that would
  necessarily reproduce for `markdown-harness`'s own edit patterns.
- **Whether any private/internal fork or downstream consumer of Drift has separately tried a
  per-document lockfile split and reported on it.** Only `fiberplane/drift`'s own public issues and PRs
  were searched; no such experiment was found, but a negative result from a GitHub search is weaker
  evidence than a positive one.
- **The full CHANGELOG timeline past roughly v0.7.0.** The fetched copy of `CHANGELOG.md` doesn't appear
  to be current for the most recent few releases (up to the actual `v0.10.1` HEAD); the version-to-
  feature mapping cited in §0 should be treated as approximately right for the early lockfile history
  and not trusted for anything past v0.7.0.
- **Whether Drift's team is aware of the DESIGN.md/markdown.zig gap described in §6.** No open issue
  discusses it; it may be a known, accepted shortcut, or it may be an actual doc-drift bug in a tool
  whose entire purpose is catching doc drift. Either reading is consistent with what was found; nothing
  in the public repo resolves which.

---

## 9. Implications (non-binding)

These are read-throughs for whoever writes the design-ADR, not decisions — the map's Notes remain
authoritative and nothing here should be treated as amending them.

- The strongest, most quantified validation found here is for a decision the map had already made before
  this research started: one ledger per document, not one root lockfile. Drift's own measured 25-31%
  residual conflict floor on its best-tuned single-file format is worth citing directly in any future
  write-up that has to justify that choice to someone unfamiliar with it — it is now a sourced number,
  not just an architectural instinct. See §3.
- The most consequential gap is that there is no working prior-art recipe for a reflow-invariant
  markdown-section hash to adapt — Drift's own doc-to-doc anchors are raw-byte hashes wearing tree-sitter
  only as a boundary-finder. Whatever mechanism `citation-binding-via-hash` ends up building has to solve
  the "which stylistic differences are trivia" problem from scratch, and at minimum needs an answer for
  list-marker character and (if hashing at the node level rather than the whole-section-text level)
  emphasis-delimiter character, both confirmed structurally significant in the grammar Drift itself
  vendors. See §6.
- The `isDocGateBlocked` shape (§5) is small enough to essentially transcribe: three branches, one
  boolean flag, refuse-don't-prompt outside a TTY. It's a strong candidate for exactly how a future spec
  should phrase the enrol/re-vouch gate in code-shaped terms rather than only in prose.
- If the map ever needs a cross-repo notion (a shared skill's own doc, checked both in its origin repo
  and after being installed elsewhere), Drift's `origin` field is a reasonable starting shape, but the
  GitHub-only comparator and the silent-skip-on-unresolvable-identity behaviour (§4) are specific
  implementation choices worth deliberately revisiting, not inheriting by default.
