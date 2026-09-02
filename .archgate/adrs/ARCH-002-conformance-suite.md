---
type: adr
id: ARCH-002
title: 'Conformance Suite'
domain: architecture
rules: true
files: ['fixtures/conformance/**', 'src/packages/config-contract/tests/conformance.test.ts']
paths: ['fixtures/conformance/**']
description: 'The Conformance suite under fixtures/conformance/: its coverage half versus its permanent specification half, the machine-readable expect marker each Conformance case carries, and the three review duties that keep the suite honest.'
---

# Conformance Suite

## Context

The documents under `fixtures/conformance/docs/` serve two roles: exercising the full configuration vocabulary and acting as a permanent specification contract for what `markdown-harness` must report on real-shaped files. An expected outcome carried only as the leading word of a reasoning paragraph is indistinguishable in a diff from a wording fix, so a behavioural contract can change under a review that reads as an edit. This ADR establishes machine-readable expectation markers and review duties so behavioural promises stay explicit, easily diffable, and protected against silent drift.

## Decision

### 1. Vocabulary and scope

1. The **Conformance suite** is `fixtures/conformance/valid-test-config.yaml` plus its **Conformance case** documents. A **fixture** is ordinary test data elsewhere that pins nothing; a **corpus** is an adopter's own tree, never this repo's synthetic material.
2. The coverage half — every rule key, constraint key and named format reached somewhere — is scaffolding a future config-schema validator replaces, and MUST grow with the vocabulary.
3. The specification half — the config plus each document's stated outcome — is permanent: the contract for what markdown-harness must report against a real-shaped file.
4. Governance MUST stay scoped to `fixtures/conformance/**`, never `fixtures/**`. `fixtures/llm-wiki/` is a separate synthetic root reserved for a freely editable demo tree.

### 2. The expect marker (📜 Rule: `expect-marker`)

1. Every Conformance case MUST carry exactly one `<!-- expect: VERDICT -->` marker (PASSES, FAILS, or UNGOVERNED), reasoning paragraph kept underneath as ordinary body text.
2. The marker MUST be an HTML comment (never a frontmatter key or leading body word), ensuring documents remain parse-clean and verdict changes produce clear single-line diffs.

### 3. Three duties over the suite

1. Growing the config vocabulary grows the suite: every new rule key, constraint key or format MUST be reached by some case's config.
2. Changing a Conformance case's stated expected outcome is a contract change, not a test fix, and MUST be reviewed as one.
3. Removing a Conformance case is a contract change on the same terms as changing one.

## Do's and Don'ts

### Do's

1. **DO** keep the suite's scope at `fixtures/conformance/**`, never `fixtures/**`. (Decision 1.4)
2. **DO** give each Conformance case exactly one `<!-- expect: VERDICT -->` marker, VERDICT one of PASSES, FAILS, UNGOVERNED. (Decision 2.1)
3. **DO** keep the reasoning paragraph beneath the marker, so a reviewer can check the two agree. (Decision 2.1)
4. **DO** add a Conformance case, or extend the suite's config, the moment the config vocabulary grows. (Decision 3.1)
5. **DO** treat a changed expected outcome as a contract change requiring review, same standing as a config change. (Decision 3.2)
6. **DO** treat a removed Conformance case as a contract change requiring review. (Decision 3.3)

### Don'ts

1. **DON'T** fold `fixtures/llm-wiki/` into this suite's glob — it is a separate, freely editable synthetic root. (Decision 1.4)
2. **DON'T** record an expected outcome as a frontmatter key or as the leading word of the reasoning paragraph. (Decision 2.2)
3. **DON'T** leave a Conformance case with zero markers, or more than one. (Decision 2, 📜 Rule: `expect-marker`)
4. **DON'T** write a marker verdict outside PASSES, FAILS, UNGOVERNED. (Decision 2.1)
5. **DON'T** reword a stated outcome, or delete a case, without review sign-off. (Decision 3.2, 3.3)

## Consequences

### Positive

- **Clear diffs & discoverability.** Expected-outcome changes appear as unambiguous single-line diffs rather than reworded prose, and verdicts are easily searchable across the suite in a single pass.
- **Documents remain realistic.** HTML comment markers preserve natural Markdown document structure and underlying reasoning without polluting frontmatter.

### Negative

- **Semantic drift is unverified.** The rule checks marker presence, singularity, and vocabulary, but cannot verify whether the verdict matches the reasoning paragraph.
- **Authoring ceremony.** Adding a new conformance case requires placing and maintaining an extra comment marker alongside reasoning prose.

### Risks

- **Reviewers treat marker as ground truth.** Reviewers might trust the marker verdict without reading the reasoning beneath it. **Mitigation:** review duties explicitly mandate human verification of marker-prose alignment.
- **Future processing strips comments.** A future pipeline might strip HTML comments before rule execution. **Mitigation:** `expect-marker` operates directly on committed source files.

## Compliance and Enforcement

**Enforcer per Discipline:** `ARCH-002-conformance-suite.rules.ts` holds the expect-marker Discipline (§2) at the `error` tier — one archgate rule scoped to `fixtures/conformance/docs/**/*.md`, checking marker presence, singularity and verdict membership. Duty 1 (§3.1) is held by the coverage loops (`it.each` over every rule key, constraint key and named format) in `src/packages/config-contract/tests/conformance.test.ts` — a vitest suite, not an archgate rule, that fails the moment the config stops exercising the full vocabulary. Duties 2 and 3 (§3.2, §3.3) are not mechanically enforced — review duties: no rule can tell a corrected verdict from an uncorrected one, or a legitimately retired case from an accidentally deleted one.

**Manual review duties** (never linted): a changed marker's verdict actually matches its reasoning paragraph (§2.1 pairs presence, never meaning); an expected-outcome change carries review sign-off, not just a green `expect-marker` run (§3.2); a removed Conformance case's removal is itself reviewed as a contract change (§3.3); `fixtures/conformance/**` is never asked to also cover `fixtures/llm-wiki/` (§1.4).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [archgate](https://archgate.dev/) — the `files:`/`paths:` scoping keys and the deterministic rule model this Discipline runs under.
