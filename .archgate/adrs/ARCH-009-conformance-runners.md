---
type: adr
id: ARCH-009
title: 'Conformance Runners'
domain: architecture
rules: false
files: ['src/packages/conformance/**']
paths: ['src/packages/conformance/**']
description: 'The runner half of the Conformance suite in src/packages/conformance/: one runner per corpus tier, tier enrolment, coverage and closure over the config vocabulary, and the pinned assessment instant.'
---

# Conformance Runners

## Context

[ARCH-002](./ARCH-002-conformance-suite.md) governs the corpus — the bytes under `fixtures/conformance/`. This record governs what reads them. The two were one record until the corpus grew a rejected-config tier and the runners moved into a Package of their own; keeping both in one file put it over the ADR size budget, and [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md) settles which way such a record splits: by the glob a Discipline needs, never by topic. A reader editing a runner loads this record; a reader editing a case loads ARCH-002.

The failure this record exists to prevent is a suite that is green over nothing. A runner looping an emptied tier passes. A coverage loop with no closure test beside it passes over a misspelled value. Each Discipline below closes one of those general runner gaps. [ARCH-011](./ARCH-011-conformance-contract-proofs.md) governs this Package's project-specific, non-tautological pins against frozen contracts.

## Decision

### 1. One runner per corpus tier

1. Each tier MUST have one `tier-record.ts` record: name, case kind, config filename, reviewed count and, where needed, assessment instant.
2. Each declared tier MUST have one `tests/<tier>-tier.test.ts` runner, reading its record through `tierForRunner(import.meta.url)`.
3. Enrolment MUST compare fixture directories and runner names separately with records; neither may be empty, and undeclared directories or absent or foreign records MUST fail.
4. This Package MUST NOT be a Module; membership follows the declared Module set, never folder position.

### 2. Coverage and closure

1. Every vocabulary tier MUST answer coverage and closure through one paired operation.
2. A caller MUST NOT ask for one half without the other.
3. A presence check MUST NOT be relied on to prove a value survived parsing.

### 3. The pinned assessment instant

1. Each tier's Assessment half MUST be judged against one pinned instant in its tier record.
2. An unpinned suite MUST be treated as non-existent, not passing.

## Do's and Don'ts

### Do's

1. **DO** declare each tier's name, case kind, config filename, count and assessment instant once in `tier-record.ts`. (Decision 1.1)
2. **DO** give each declared tier exactly one runner named `<tier>-tier.test.ts`, and read its record through `tierForRunner(import.meta.url)`. (Decision 1.2)
3. **DO** compare the fixture tree and runner set independently with the declaration, and reject undeclared fixture directories. (Decision 1.3, 1.4)
4. **DO** use one paired coverage-and-closure operation for every vocabulary tier. (Decision 2.1, 2.2)
5. **DO** pin each Assessment tier's instant in its record. (Decision 3.1)

### Don'ts

1. **DON'T** add a corpus tier without its declaration and runner, or leave either behind a deleted tier. (Decision 1.1, 1.2)
2. **DON'T** call coverage or closure independently. (Decision 2.2)
3. **DON'T** rely on a presence check to prove a value survived parsing. (Decision 2.3)
4. **DON'T** treat this Package as a Module, or move it into one. (Decision 1.4)
5. **DON'T** read the assessment instant from the wall clock, the config under test, or a runner-local constant. (Decision 3)

## Consequences

### Positive

- **A retirement is one reviewed change.** Deleting a fault code, its case and its catalog entry either compiles as a set or fails naming the line that is out of step.
- **An emptied tier fails.** Enrolment reads each runner's own-record declaration, while the reviewed record count closes the fixture loop.
- **The Package is owned by no Module.** A tier that two Modules govern has somewhere to live, which it does not when the runner sits inside a Module's Package.

### Negative

- **Reviewed tier records age.** Adding a case means editing a record, and the number carries no meaning beyond being reviewed.

### Risks

- **Enrolment passes over two empty sets.** A derivation bug that empties both sides asserts equality successfully. **Mitigation:** §1.2 requires asserting non-emptiness explicitly, and the assertion exists in `tier-enrolment.test.ts`.

## Compliance and Enforcement

**Enforcer per Discipline:** this record has no companion `.rules.ts`, because every Discipline above is held by a channel that reads more than an archgate rule can.

**§1.2–1.3's enrolment** is held by `src/packages/conformance/tests/tier-enrolment.test.ts`: it compares fixture directories and runner names independently with `tier-record.ts`, rejects an undeclared fixture directory, and requires each runner to call `tierForRunner(import.meta.url)`. **§1.1's reviewed count** lives beside the rest of the record, so an emptied tier fails against a reviewed number rather than passing over nothing. **§1.4** follows from a suite that checks more than one tier being ownable by no Module, and from a refused config producing no document for any Module to own.

**§2's coverage and closure** are held by `coverageAndClosure` in `src/packages/conformance/lib/tier/`, called from the frontmatter and rejected-config runners. It answers both directions in one result, and fails the moment a tier's config stops exercising the vocabulary or carries a value outside it. §2.2 exists because either half alone is blind: the named-format tier once had coverage and no closure test, so `format: datetiem` failed nothing.

**§3's pinned instant** is the `assessmentInstant` in the tier record, the only instant that tier's Assessment half is judged against. An unpinned suite is non-existent because a wall-clock assertion is green tomorrow for a different reason.

**Manual review duties** (never linted): a reviewed tier-record count was actually re-counted rather than incremented on faith (§1.1); this Package was not quietly enrolled in the declared Module set (§1.4).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Conformance Suite](./ARCH-002-conformance-suite.md) — the `fixtures/conformance/**` half of this record.
- [Conformance Contract Proofs](./ARCH-011-conformance-contract-proofs.md) — the fault-catalog pin extracted from this record and the two-sided translation proof beside it.
- [Module Boundaries](./ARCH-008-module-boundaries.md) — the declared Module set that §1.4 defers to.
- [Testing](./ARCH-003-testing.md) — the runner conventions these suites sit inside.
- [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md) — Disciplines are grouped by glob, which is why this record exists.
