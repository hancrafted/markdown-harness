---
name: trace-term-provenance-before-renaming
description: Han asks where a term came from before he decides whether to keep it — trace the etymology yourself; it is a fact question, never one to hand back. Supporting provenance is not enough: check CONTEXT.md for a term that already owns the word
metadata:
  type: feedback
---

When a vocabulary decision is on the table, Han's first move is often **"where does this name come from?"** — not "should we change it". Answer it with traced provenance before proposing anything: which vendored skill or upstream source supplied the word, whether it was borrowed or coined here, and the commit that coined it (`git log -S'**Term**:' -- CONTEXT.md`). Then name the collision the term still carries, even if the glossary already lists it under _Avoid_.

**Why:** he weighs a term by what it inherits and what it is load-bearing for, not by whether it reads well. Asked about `Package`, the useful answer was that `codebase-design` defines only **Module** and uses "package" lower-case as an example of scale; the vendored `setup-ts-deep-modules` skill supplies the folder, `PACKAGES_ROOT` and the boundary rules; and the capital-P term is this repo's own. That made "keep it" obvious — renaming the term while the vendored config fixes the folder would split the word from the tree.

**How to apply:** treat the provenance question as a **fact question, yours to answer** (the grilling skill says so explicitly — never hand a lookup back to him). Search the vendored skills, the research docs, and `git log -S` on the glossary. Report the source, the coinage commit, the open collision, and the site count. Then recommend. Pairs with [[vocabulary-over-migration-cost]]: the site count is scope, never the argument.

**Recurrence 2026-09-08 — provenance that _supports_ a name is not sufficient.** Recommending a name
for the new run-time command, I argued `--steer` from `docs/vision/product.md`'s horizon row, which
literally reads "`init`, `check`, `steer` demonstrable". The provenance was real and it pointed the
wrong way: `CONTEXT.md` already defines **Steering query** as asking what governs a path _before_ the
file is written, and `package.json`'s own description binds "steering query" to `--query`. `--steer`
would have taken the name of what `--query` does while doing the opposite. Han caught it, from
instinct rather than the citation.

So run **two** searches, not one: provenance (does anything support this word?) **and** collision
(does a canonical term in `CONTEXT.md` already own it?). The second is the one that bites, because a
vision doc is prose written before the glossary hardened, while `CONTEXT.md` is the glossary. When
the two disagree, the glossary wins and the vision doc is the stale document.

Two durable outcomes from that round, both now recorded in the tree rather than here: a name must not
borrow a word that carries a published contract (`check` means "exits 1, and is hermetic" in this
product, so `--trust-check` would have invited a red build at midnight on an unchanged tree), and the
command set is all **imperative verbs**, so the verb must take the document as its object — which is
why `--trust` failed and `--assess` won. Rejected candidates are listed with reasons in decision 5 of
[map #54](https://github.com/hancrafted/markdown-harness/issues/54); see [[two-corpus-governance-test]].
