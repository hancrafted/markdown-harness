---
type: adr
id: ARCH-002
title: 'Conformance Suite'
domain: architecture
rules: true
files: ['fixtures/conformance/**']
paths: ['fixtures/conformance/**']
description: 'The corpus half of the Conformance suite under fixtures/conformance/: corpus tiers and what each holds, the coverage half versus the permanent specification half, the expect and assess markers each Conformance case carries, and the review duties that keep the corpus honest.'
---

# Conformance Suite

## Context

A corpus tier's documents both exercise the full configuration vocabulary and act as a permanent specification: the contract for what `markdown-harness` must report on real-shaped files. An expected outcome carried only by a reasoning paragraph's leading word is indistinguishable in a diff from a wording fix, so the contract can change under a review that reads an edit. One Module's cases, a refused config, and a corpus two Modules govern at once are three subjects rather than one: hence tiers. Machine-readable markers and review duties keep the promises explicit and diffable.

A **fixture** pins nothing; a **corpus** is an adopter's tree. A **corpus tier** is one directory rooted as a synthetic repo root — one config plus the cases it governs, one config per tier, so every location is tier-relative and a tier moves whole.

This record governs the **corpus** — the bytes under `fixtures/conformance/`. The runners that read them live under `src/packages/conformance/` and are governed by [ARCH-009](./ARCH-009-conformance-runners.md): one record split by the glob each needs, per [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md), never by topic.

## Decision

### 1. Vocabulary and scope

1. The **Conformance suite** is every **corpus tier** under `fixtures/conformance/` plus the runners in `src/packages/conformance/`. This record's scope MUST stay `fixtures/conformance/**`, never `fixtures/**`.
2. A **Module tier** holds **Conformance case** documents under `docs/`. A **rejected-config case** is one directory under `fixtures/conformance/rejected-config/`: a config the loader MUST refuse plus one `expected-rejection.json` freezing it. That tier MUST hold no markdown.
3. `fixtures/llm-wiki/` MUST NOT be folded into this record's globs.
4. The **coverage half** — every key of every **vocabulary tier** (rule, constraint, `allowed` entry, named format) reached — MUST grow with the vocabulary. The **specification half** — each tier's config plus its cases' stated outcomes — is permanent.

### 2. The expect marker (📜 Rule: `expect-marker`)

1. Every case MUST carry exactly one `<!-- expect: VERDICT -->` marker — PASSES, FAILS or UNGOVERNED — with its reasoning paragraph underneath.
2. The marker MUST be an HTML comment, never a frontmatter key and never the body's leading word.
3. The case glob MUST reach tier depth; matching zero files MUST itself be a violation.

### 3. Two duties over the corpus

1. Changing a case's stated outcome, or removing a case, is a contract change, never a test fix; moving one is neither if the bytes hold.
2. Every vocabulary tier MUST also be **closed**: no key outside the vocabulary may appear.

### 4. The assess marker (📜 Rule: `assess-marker`)

1. A case MAY carry one `<!-- assess: ACTION -->` marker — REVIEW, PROCEED or FIX_FILE. At most one; absence is legal.
2. The assessment instant MUST NOT live in the config under test; moving it is a §3.1 change.

### 5. Defective bytes stay unformatted

1. Corpus bytes defective on purpose MUST be excluded from prettier, scoped to the directory rather than the files that fail today; `fixtures/conformance/rejected-config/**` MUST carry such an entry.

## Do's and Don'ts

### Do's

1. **DO** keep this record's scope at `fixtures/conformance/**`. (Decision 1.1)
2. **DO** give every case exactly one `<!-- expect: VERDICT -->` marker. (Decision 2.1)
3. **DO** keep the reasoning paragraph beneath the marker, so a reviewer can check the two agree. (Decision 2.1)
4. **DO** prove a case glob's reach against the real tree. (Decision 2.3)
5. **DO** give a rejected-config case one refused config and one `expected-rejection.json`. (Decision 1.2)
6. **DO** add a case and extend its tier's config in the same change. (Decision 1.4)
7. **DO** write an `assess:` action as REVIEW, PROCEED or FIX_FILE. (Decision 4, 📜 Rule: `assess-marker`)
8. **DO** treat a changed stated outcome as a contract change. (Decision 3.1)
9. **DO** close every vocabulary tier as well as cover it. (Decision 3.2)
10. **DO** move a `.prettierignore` entry in the change that moves the tree it names. (Decision 5.1)

### Don'ts

1. **DON'T** fold `fixtures/llm-wiki/` into this record's globs. (Decision 1.3)
2. **DON'T** record an expected outcome as a frontmatter key or the leading word of the prose. (Decision 2.2)
3. **DON'T** leave a case with zero markers, or more than one. (Decision 2, 📜 Rule: `expect-marker`)
4. **DON'T** write a verdict outside PASSES, FAILS, UNGOVERNED. (Decision 2.1)
5. **DON'T** reword a stated outcome, or delete a case, without review sign-off. (Decision 3.1)
6. **DON'T** leave the case glob pointed where the corpus no longer is. (Decision 2.3)
7. **DON'T** enumerate only some vocabulary tiers when extending coverage. (Decision 3.2)
8. **DON'T** file markdown into the rejected-config tier. (Decision 1.2)
9. **DON'T** write a second `assess:` marker, or put the instant in the config under test. (Decision 4)
10. **DON'T** let `prettier --write` reach deliberately malformed corpus bytes. (Decision 5.1)

## Consequences

### Positive

- **Clear diffs and discoverability.** An expected-outcome change is a single-line diff rather than reworded prose, and verdicts are searchable in one pass.
- **Documents remain realistic.** HTML comment markers preserve natural Markdown structure and reasoning without polluting frontmatter.
- **A tier move is a rename.** Every location is tier-relative and the runner supplies the prefix, so relocating a tier is provable by a rename-detecting diff.

### Negative

- **Two markers, two cardinalities.** `expect:` is required exactly once and `assess:` at most once, so an author must know which marker they are writing to know whether absence is legal.
- **The pinned instant ages.** Every `fresh` case is fresh only relative to a constant in its runner, so the suite says nothing about real elapsed time — deliberately: it is the only way a freshness test is green tomorrow for the reason it was green today.
- **Semantic drift is unverified.** The rule checks presence, singularity and vocabulary; it cannot check whether the verdict matches the prose.
- **Authoring ceremony.** A new case needs a marker maintained alongside its prose, and a new tier needs a runner before the suite can be green.
- **Coverage says nothing about values.** Coverage asserts a key is reached, never that its value survived parsing: an unquoted YAML flow scalar splits on its own commas, so `{ value: log, intent: A history, newest first. }` yields a halved `intent` and a null key named after the tail, every presence check still passing. Five such entries sat undetected — each an Operator's sentence silently truncated — until §3.2's closure duty caught them.

### Risks

- **An unmarked case looks deliberate.** A case that should state a freshness answer and carries none is indistinguishable from one that correctly states none. **Mitigation:** the runner asserts all three actions are exercised, so the suite cannot go silent on a whole action; per-case omissions stay a review duty.
- **Reviewers treat the marker as ground truth.** Reviewers might trust the verdict without reading the reasoning beneath it. **Mitigation:** a review duty mandates checking the marker against the prose.
- **Future processing strips comments.** A pipeline might strip HTML comments before rules run. **Mitigation:** `expect-marker` reads committed source directly.

## Compliance and Enforcement

**Enforcer per Discipline:** `ARCH-002-conformance-suite.rules.ts` holds two `error`-tier rules, both looping the case glob `fixtures/conformance/*/docs/**/*.md`. `expect-marker` holds §2 — presence, singularity, verdict membership, and §2.3's empty-match guard. `assess-marker` holds §4.1 — at most one marker and action membership, absence passing silently. They are two rules because their cardinalities differ. Each regex matches only its own keyword, which is why the second marker needed no change to the first — and why, until it existed, an `assess:` marker was **ungoverned** rather than blocked.

**§2.3's guard, and why only one rule carries it.** Both rules loop the same glob, so one guard proves its reach for both. The loop itself cannot fail — had the corpus moved and the glob stayed, every case would have gone ungoverned under a green run. **The sibling `.rules.test.ts` proves what a rule DECIDES and never what it REACHES**: its context is hand-built, so a glob aimed at a vanished directory passes every test in it. Reach is provable only against the real tree.

**§1.4's halves are enforced from the runner side**, by the coverage, closure and enrolment assertions governed by [ARCH-009](./ARCH-009-conformance-runners.md). Coverage proves the SUITE complete; closure proves the CONFIG complete, which is why §3.2 demands both. §3.1 is a review duty: no rule can tell a corrected verdict from an uncorrected one, or a retired case from an accidentally deleted one.

**§5's entries** live in `.prettierignore`. The rejected-config tier earns one because some of its configs are refused precisely for not being YAML, and formatting one repairs the fault the case exists to state. A stale entry fails nothing — it matches no files and the malformed bytes are reformatted under a green run — so the entry moves in the change that moves the tree.

**Manual review duties** (never linted): a changed verdict actually matches its reasoning paragraph (§2.1 pairs presence, never meaning); an expected-outcome change or a removed case carries review sign-off (§3.1); these globs never also cover `fixtures/llm-wiki/` (§1.3).

**Two named gaps, both measured, neither papered over.**

1. **"Path does not exist" cannot be a Conformance case.** A case IS a document and this case is the absence of one, so nothing can carry a marker. Covered by `src/packages/frontmatter-harness/tests/assess.test.ts` instead, recorded rather than left looking covered.
2. **The Module-wide `frontmatter.assess:` key is NOT reached by the `frontmatter` tier's config, a deliberate exception to §1.4.** A Module-wide prompt forces `stale_after: { presence: required }` onto every constraining rule — what `CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD` asserts — and the tier holds nine, so reaching it would mean rewriting the corpus to satisfy a key rather than writing a key to exercise the corpus. The rule-level `assess:` block IS reached, by `freshness`; the Module-wide one is covered by `src/packages/frontmatter-harness/lib/validate/assess-faults.test.ts`.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Conformance Runners](./ARCH-009-conformance-runners.md) — the `src/packages/conformance/**` half of this record.
- [Module Boundaries](./ARCH-008-module-boundaries.md) — why a suite checking more than one tier belongs to no Module.
- [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md) — Disciplines are grouped by glob, which is why this record split.
- [archgate](https://archgate.dev/) — the `files:`/`paths:` scoping keys and the deterministic rule model this Discipline runs under.
