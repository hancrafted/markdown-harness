---
type: adr
id: ARCH-002
title: 'Conformance Suite'
domain: architecture
rules: true
files: ['fixtures/conformance/**', 'src/packages/conformance/**']
paths: ['fixtures/conformance/**', 'src/packages/conformance/**']
description: 'Corpus tiers under fixtures/conformance/ with one runner each in src/packages/conformance/: the coverage half versus the permanent specification half, the expect marker each Conformance case carries, and the review duties that keep the suite honest.'
---

# Conformance Suite

## Context

A corpus tier's documents both exercise the full configuration vocabulary and act as a permanent specification contract for what `markdown-harness` must report on real-shaped files. An expected outcome carried only as a reasoning paragraph's leading word is indistinguishable in a diff from a wording fix, so a contract can change under a review that reads as an edit. One Module's cases, a refused config, and a corpus two Modules govern at once are three subjects rather than one: hence tiers. Machine-readable markers, tier enrolment and review duties keep those promises explicit and diffable.

## Decision

### 1. Vocabulary and scope

1. The **Conformance suite** is every **corpus tier** under `fixtures/conformance/` plus the runners in `src/packages/conformance/`; scope MUST stay those two globs, never `fixtures/**`. A **fixture** pins nothing; a **corpus** is an adopter's tree.
2. A corpus tier is one directory whose root is a synthetic repo root, so its selectors are relative to it and it moves whole. A Module tier holds **Conformance case** documents under `docs/`; the rejected-config tier holds refused config bytes, no markdown.
3. Each corpus tier MUST have exactly one runner, `tests/<tier>-tier.test.ts`; both sets MUST be derived from the tree and asserted equal.
4. The coverage half — every key of every **vocabulary tier** (rule, constraint, `allowed` entry, format) reached somewhere — MUST grow with the vocabulary. The specification half, each tier's config plus its cases' stated outcomes, is permanent.

### 2. The expect marker (📜 Rule: `expect-marker`)

1. Every case MUST carry exactly one `<!-- expect: VERDICT -->` marker (PASSES, FAILS or UNGOVERNED), its reasoning paragraph underneath as body text.
2. The marker MUST be an HTML comment, never a frontmatter key or a leading body word.
3. The case glob MUST reach tier depth, and matching zero files MUST itself be a violation: a loop over nothing reports success.

### 3. Two duties over the suite

1. Changing a case's stated outcome, or removing a case, is a contract change, never a test fix. Moving one is neither, provided its bytes do not change.
2. Every vocabulary tier MUST also be **closed**: assert no key outside that vocabulary appears. Coverage proves the SUITE complete; closure the CONFIG.

### 4. The assess marker (📜 Rule: `assess-marker`)

1. A case MAY carry one `<!-- assess: ACTION -->` marker (REVIEW, PROCEED, FIX_FILE). At most one; absence is legal.
2. The Assessment instant MUST be pinned in its tier's runner, never in the config under test; moving it is a §3.1 change.

## Do's and Don'ts

### Do's

1. **DO** keep scope at `fixtures/conformance/**` and `src/packages/conformance/**`. (Decision 1.1)
2. **DO** give each case exactly one `<!-- expect: VERDICT -->` marker, VERDICT one of PASSES, FAILS, UNGOVERNED. (Decision 2.1)
3. **DO** keep the reasoning paragraph beneath the marker, so a reviewer can check the two agree. (Decision 2.1)
4. **DO** give every corpus tier one runner, deriving both sets from the tree rather than listing them. (Decision 1.3)
5. **DO** prove the case glob's reach against the real tree; a sibling test proves only what a rule decides. (Decision 2.3)
6. **DO** add a case, or extend a tier's config, the moment the config vocabulary grows. (Decision 1.4)
7. **DO** mark a case whose freshness answer is contract: `<!-- assess: REVIEW|PROCEED|FIX_FILE -->`. (Decision 4, 📜 Rule: `assess-marker`)
8. **DO** pin the Assessment instant beside the runner, and treat a changed outcome or a removed case as a contract change. (Decision 3.1, 4.2)
9. **DO** close every vocabulary tier as well as cover it. (Decision 3.2)

### Don'ts

1. **DON'T** fold `fixtures/llm-wiki/` into this suite's globs. (Decision 1.1)
2. **DON'T** record an expected outcome as a frontmatter key or as the leading word of the prose. (Decision 2.2)
3. **DON'T** leave a case with zero markers, or more than one. (Decision 2, 📜 Rule: `expect-marker`)
4. **DON'T** write a verdict outside PASSES, FAILS, UNGOVERNED. (Decision 2.1)
5. **DON'T** reword a stated outcome, or delete a case, without review sign-off. (Decision 3.1)
6. **DON'T** add a corpus tier without its runner, or leave the case glob pointed where the corpus no longer is. (Decision 1.3, 2.3)
7. **DON'T** enumerate only some vocabulary tiers when extending coverage. (Decision 1.4, 3.2)
8. **DON'T** rely on a presence check to prove a value survived parsing. (Decision 3.2)
9. **DON'T** write a second `assess:` marker, an action outside the three, or put the instant in the config under test. (Decision 4)

## Consequences

### Positive

- **Clear diffs & discoverability.** An expected-outcome change is a single-line diff rather than reworded prose, and verdicts are searchable in one pass.
- **Documents remain realistic.** HTML comment markers preserve natural Markdown structure and reasoning without polluting frontmatter.
- **A tier move is a rename.** Every location is tier-relative and the runner supplies the prefix, so relocating a tier is provable by a rename-detecting diff.

### Negative

- **Two markers, two cardinalities.** `expect:` is required exactly once and `assess:` at most once, so an author must know which marker they are writing to know whether absence is legal. Requiring both everywhere would claim freshness for cases that make none.
- **The pinned instant ages.** Every `fresh` case is fresh only relative to a constant in its runner, so the suite says nothing about real elapsed time — deliberately: it is the only way a freshness test is green tomorrow for the reason it was green today.
- **Semantic drift is unverified.** The rule checks presence, singularity and vocabulary; it cannot check whether the verdict matches the prose.
- **Authoring ceremony.** A new case needs a marker maintained alongside its prose, and a new tier needs a runner before the suite can be green.
- **Coverage says nothing about values.** Coverage asserts a key is reached, never that its value survived parsing: an unquoted YAML flow scalar splits on its own commas, so `{ value: log, intent: A history, newest first. }` yields a halved `intent` and a null key named after the tail, with every presence check still passing. Five such entries sat undetected until §3.2's closure duty caught them.

### Risks

- **An unmarked case looks deliberate.** A case that should state a freshness answer and carries none is indistinguishable from one that correctly states none. **Mitigation:** the runner asserts all three actions are exercised, so the suite cannot go silent on a whole action; per-case omissions stay a review duty.
- **Reviewers treat the marker as ground truth.** Reviewers might trust the verdict without reading the reasoning beneath it. **Mitigation:** a review duty mandates checking marker against prose.
- **Future processing strips comments.** A pipeline might strip HTML comments before rules run. **Mitigation:** `expect-marker` reads committed source directly.
- **An enrolled tier can still be unread.** A runner that loops over an emptied tier is green over nothing. **Mitigation:** each runner states its declared case count by hand, so an emptied tier fails against a reviewed number.

## Compliance and Enforcement

**Enforcer per Discipline:** `ARCH-002-conformance-suite.rules.ts` holds two `error`-tier rules, both looping the case glob `fixtures/conformance/*/docs/**/*.md`. `expect-marker` holds §2 — presence, singularity, verdict membership, and §2.3's empty-match guard. `assess-marker` holds §4.1 — at most one marker and action membership, absence passing silently. They are two rules because their cardinalities differ. Each regex matches only its own keyword, which is why the second marker needed no change to the first — and why, until it existed, an `assess:` marker was **ungoverned** rather than blocked.

**§2.3's guard, and why only one rule carries it.** Both rules loop the same glob, so one guard proves its reach for both; a second would report the same fact twice. The loop itself cannot fail — had the corpus moved and the glob stayed, every case would have gone ungoverned under a green run. **The sibling `.rules.test.ts` proves what a rule DECIDES and never what it REACHES**: its context is hand-built, so a glob aimed at a vanished directory passes every test in it. Reach is provable only against the real tree — move the fixtures without moving the glob, run `archgate check`, read the violation — an obligation of any change that moves the corpus.

**Coverage and closure (§1.4, §3.2)** are held by `src/packages/conformance/tests/frontmatter-tier.test.ts` — an `it.each` loop per vocabulary tier for coverage, plus one closure test per tier. It is a vitest suite, and it fails the moment a tier's config stops exercising the vocabulary or carries a key outside it. Either alone is blind: the named-format tier once had coverage and no closure test, so `format: datetiem` failed nothing. **§1.3's enrolment** is held by `tests/tier-enrolment.test.ts`: it derives the tier directories from the fixture tree and the tier names from the `*-tier.test.ts` file names, asserts the two sets equal, and asserts neither is empty — because two empty sets are equal. **§3.1** is a review duty: no rule can tell a corrected verdict from an uncorrected one, or a retired case from an accidentally deleted one. **§4.2's pinned instant** is `ASSESSMENT_INSTANT` in `frontmatter-tier.test.ts`, the only instant the Assessment half is judged against: an unpinned suite is not a passing suite but a non-existent one.

The suite lives in `src/packages/conformance/` rather than in a Module Package: it checks more than one tier, and a refused config produces no document for any Module to own. That Package is **not** a Module — membership is decided by the declared Module set, not by where a folder sits.

**Manual review duties** (never linted): a changed verdict actually matches its reasoning paragraph (§2.1 pairs presence, never meaning); an expected-outcome change or a removed case carries review sign-off, not just a green `expect-marker` run (§3.1); these globs never also cover `fixtures/llm-wiki/` (§1.1).

**Two named gaps, both measured, neither papered over.**

1. **"Path does not exist" cannot be a Conformance case.** A case IS a document and this case is the absence of one, so nothing can carry a marker. Covered by `src/packages/frontmatter-harness/tests/assess.test.ts` instead, recorded here rather than left looking covered.
2. **The Module-wide `frontmatter.assess:` key is NOT reached by the `frontmatter` tier's config, a deliberate exception to §1.4.** A Module-wide prompt forces `stale_after: { presence: required }` onto every constraining rule — what `CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD` asserts — and the tier holds nine, so reaching the key would mean rewriting the corpus to satisfy a key rather than writing a key to exercise the corpus. The rule-level `assess:` block IS reached, by `freshness`; the Module-wide one is covered by `src/packages/frontmatter-harness/lib/validate/assess-faults.test.ts`, the only place that fault is asserted. Stated as an exception so a later reader finds a decision rather than a hole.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [archgate](https://archgate.dev/) — the `files:`/`paths:` scoping keys and the deterministic rule model this Discipline runs under.
