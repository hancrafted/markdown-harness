---
type: adr
id: ARCH-002
title: 'Conformance Suite'
domain: architecture
rules: true
files: ['fixtures/conformance/**', 'src/config/conformance.test.ts']
paths: ['fixtures/conformance/**']
description: 'The Conformance suite under fixtures/conformance/: its coverage half versus its permanent specification half, the machine-readable expect marker each Conformance case carries, and the three review duties that keep the suite honest.'
---

# Conformance Suite

## Context

The 14 documents under `fixtures/conformance/docs/` do two jobs at once. COVERAGE: together with the suite's config they reach every key in the config vocabulary, including keys no real file would exercise. SPECIFICATION: each document, read against that config, fixes what markdown-harness must report on a real-shaped file. Only the second job is a contract — changing what a document is expected to report changes a promise about adopter-facing behaviour; growing coverage for a vocabulary key that already exists changes nothing about that promise.

Today the specification half's expected outcome lives only as the first word of a reasoning paragraph — "PASSES.", "FAILS three ways:", "UNGOVERNED." — mixed into ordinary body prose. A reviewer diffing an outcome change sees a reworded paragraph, indistinguishable at a glance from a wording fix. Two of the fourteen documents, `docs/index.md` and `docs/log.md`, state no outcome at all, despite pinning behaviour on the same terms as the other twelve.

Rejected alternative: record the expected outcome as a frontmatter key, e.g. `expect: PASSES`. Frontmatter is exactly what several Conformance cases exist to constrain — one demonstrates `frontmatter: forbidden`, another demonstrates `unknownKeys: forbidden` — so adding a key there would either violate the very rule the case demonstrates, or force a suite-only exception into a config whose whole point is to look like an adopter's. An external manifest mapping file paths to outcomes was rejected too: it moves the verdict away from the reasoning it belongs to, so the two drift with no diff calling attention to it.

## Decision

### 1. Vocabulary and scope

1. The **Conformance suite** is `fixtures/conformance/valid-test-config.yaml` plus its 14 **Conformance case** documents. A **fixture** is ordinary test data elsewhere that pins nothing; a **corpus** is an adopter's own tree, never this repo's synthetic material.
2. The coverage half — every rule key, constraint key and named format reached somewhere — is scaffolding a future config-schema validator replaces, and MUST grow with the vocabulary.
3. The specification half — the config plus each document's stated outcome — is permanent: the contract for what markdown-harness must report against a real-shaped file.
4. Governance MUST stay scoped to `fixtures/conformance/**`, never `fixtures/**`. `fixtures/llm-wiki/` is a separate synthetic root reserved for a freely editable demo tree; a repo-wide glob would falsely tell an agent that a demo file is frozen.

### 2. The expect marker (📜 Rule: `expect-marker`)

1. Every Conformance case MUST carry exactly one `<!-- expect: VERDICT -->` marker (PASSES, FAILS, or UNGOVERNED), reasoning paragraph kept underneath as ordinary body text.
2. The marker MUST be an HTML comment, never a frontmatter key or the reasoning's leading word — invisible to frontmatter parsing and the vendored spec's document model, so the file still reads as a plausible real document.
3. Changing the marker's word is now a one-line diff a reviewer cannot miss, not a reworded paragraph one easily could.
4. This convention has no verified external precedent — no comparable marker was found elsewhere; it is new, not adopted from prior art.

### 3. Three duties over the suite

1. Growing the config vocabulary grows the suite: every new rule key, constraint key or format MUST be reached by some case's config.
2. Changing a Conformance case's stated expected outcome is a contract change, not a test fix, and MUST be reviewed as one.
3. Removing a Conformance case is a contract change on the same terms as changing one.

## Do's and Don'ts

### Do's

1. **DO** keep the suite's scope at `fixtures/conformance/**`, never `fixtures/**`. (Decision 1)
2. **DO** give each Conformance case exactly one `<!-- expect: VERDICT -->` marker, VERDICT one of PASSES, FAILS, UNGOVERNED. (Decision 2)
3. **DO** keep the reasoning paragraph beneath the marker, so a reviewer can check the two agree. (Decision 2)
4. **DO** add a Conformance case, or extend the suite's config, the moment the config vocabulary grows. (Decision 3)
5. **DO** treat a changed expected outcome as a contract change requiring review, same standing as a config change. (Decision 3)
6. **DO** treat a removed Conformance case as a contract change requiring review. (Decision 3)

### Don'ts

1. **DON'T** fold `fixtures/llm-wiki/` into this suite's glob — it is a separate, freely editable synthetic root. (Decision 1)
2. **DON'T** record an expected outcome as a frontmatter key or as the leading word of the reasoning paragraph. (Decision 2)
3. **DON'T** leave a Conformance case with zero markers, or more than one. (Decision 2, 📜 Rule: `expect-marker`)
4. **DON'T** write a marker verdict outside PASSES, FAILS, UNGOVERNED. (Decision 2)
5. **DON'T** claim external precedent for the marker convention — none is verified. (Decision 2)
6. **DON'T** reword a stated outcome, or delete a case, without review sign-off. (Decision 3)

## Consequences

**Positive:**

1. **Fast review:** an expected-outcome change is now a one-line diff instead of a reworded paragraph.
2. **Grep-able suite:** every case's verdict is readable in one pass across the tree, previously only readable by opening each file.
3. **Content survives:** the reasoning prose is untouched underneath the marker; the marker adds a signal rather than replacing content that made the document look real.
4. **Honest scope:** `fixtures/conformance/**` stays narrow enough that `fixtures/llm-wiki/` is never mistaken for frozen contract material.

**Negative:**

1. **Marker/prose can still drift:** the rule checks that a marker exists, is singular, and names a known word — it cannot check that the word matches what the reasoning paragraph actually argues.
2. **Authoring ceremony:** a new Conformance case now needs a correctly placed HTML comment in addition to its prose, one more thing to get right that `expect-marker` cannot verify is placed next to the reasoning it names.
3. **Unproven convention:** no external precedent means no borrowed tooling or reviewer familiarity — every future maintainer learns this convention from this ADR alone.

**Risks:**

1. **Marker treated as ground truth:** a reviewer trusts the marker and stops reading the reasoning beneath it, defeating the reason the reasoning was kept. **Mitigation:** Decision 3's review duties exist precisely because the marker is not self-certifying — it is a diff signal, not a substitute for reading the case.
2. **A future pipeline strips HTML comments** before this rule ever reads the file, silently blinding it. **Mitigation:** `expect-marker` reads each Conformance case as committed; no such pipeline exists in this repo today, and adding one is itself a change to this Decision's premise.

## Compliance and Enforcement

**Enforcer per Discipline:** `ARCH-002-conformance-suite.rules.ts` holds the expect-marker Discipline (§2) at the `error` tier — one archgate rule scoped to `fixtures/conformance/docs/**/*.md`, checking marker presence, singularity and verdict membership. Duty 1 (§3.1) is held by the coverage loops (`it.each` over every rule key, constraint key and named format) in `src/config/conformance.test.ts` — a vitest suite, not an archgate rule, that fails the moment the config stops exercising the full vocabulary. Duties 2 and 3 (§3.2, §3.3) are not mechanically enforced — review duties: no rule can tell a corrected verdict from an uncorrected one, or a legitimately retired case from an accidentally deleted one.

**Manual review duties** (never linted): a changed marker's verdict actually matches its reasoning paragraph (§2.1 pairs presence, never meaning); an expected-outcome change carries review sign-off, not just a green `expect-marker` run (§3.2); a removed Conformance case's removal is itself reviewed as a contract change (§3.3); `fixtures/conformance/**` is never asked to also cover `fixtures/llm-wiki/` (§1.4).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [archgate](https://archgate.dev/) — the `files:`/`paths:` scoping keys and the deterministic rule model this Discipline runs under.
