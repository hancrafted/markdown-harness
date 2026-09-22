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

1. Each corpus tier MUST have exactly one runner at `src/packages/conformance/tests/<tier>-tier.test.ts`.
2. Tier enrolment MUST be asserted: tier directories derived from the tree and tier names derived from the `*-tier.test.ts` names MUST be equal, and neither set empty.
3. Each runner MUST state its declared case count by hand.
4. This Package MUST NOT be a Module; membership follows the declared Module set, never folder position.

### 2. Coverage and closure

1. Every vocabulary tier MUST have a coverage assertion (each key reached) and a closure assertion (no key outside it).
2. Neither MUST stand without the other.
3. A presence check MUST NOT be relied on to prove a value survived parsing.

### 3. The pinned assessment instant

1. Each tier's Assessment half MUST be judged against one `ASSESSMENT_INSTANT` pinned in that tier's runner.
2. An unpinned suite MUST be treated as non-existent, not passing.

## Do's and Don'ts

### Do's

1. **DO** give each corpus tier exactly one runner named `<tier>-tier.test.ts`. (Decision 1.1)
2. **DO** derive both the tier directories and the tier names, assert the two sets equal, and assert neither is empty. (Decision 1.2)
3. **DO** state each runner's case count by hand, so an emptied tier fails. (Decision 1.3)
4. **DO** write a closure assertion beside every coverage loop. (Decision 2.1, 2.2)
5. **DO** pin each tier's `ASSESSMENT_INSTANT` in its own runner. (Decision 3.1)

### Don'ts

1. **DON'T** add a corpus tier without its runner, or leave a runner behind a deleted tier. (Decision 1.1, 1.2)
2. **DON'T** let a coverage loop stand without a closure test. (Decision 2.2)
3. **DON'T** rely on a presence check to prove a value survived parsing. (Decision 2.3)
4. **DON'T** treat this Package as a Module, or move it into one. (Decision 1.4)
5. **DON'T** read the assessment instant from the wall clock or from the config under test. (Decision 3)

## Consequences

### Positive

- **A retirement is one reviewed change.** Deleting a fault code, its case and its catalog entry either compiles as a set or fails naming the line that is out of step.
- **An emptied tier fails.** Enrolment plus a hand-stated case count means the two ways a suite can go green over nothing are both closed.
- **The Package is owned by no Module.** A tier that two Modules govern has somewhere to live, which it does not when the runner sits inside a Module's Package.

### Negative

- **Hand-stated case counts age.** Adding a case means editing a number in the runner, and the number carries no meaning beyond being reviewed.

### Risks

- **Enrolment passes over two empty sets.** A derivation bug that empties both sides asserts equality successfully. **Mitigation:** §1.2 requires asserting non-emptiness explicitly, and the assertion exists in `tier-enrolment.test.ts`.

## Compliance and Enforcement

**Enforcer per Discipline:** this record has no companion `.rules.ts`, and that is the decision rather than an omission — every Discipline above is held by a channel that already exists and reads more than an archgate rule can. Restating the `ConfigFaultCode` catalog inside a rules file is precisely the drift §3.1 prevents.

**§1.2's enrolment** is held by `src/packages/conformance/tests/tier-enrolment.test.ts`: it derives the tier directories from the fixture tree and the tier names from the `*-tier.test.ts` file names, asserts the two sets equal, and asserts neither is empty — because two empty sets are equal. **§1.3's hand-stated count** exists so an emptied tier fails against a reviewed number rather than passing over nothing. **§1.4** follows from a suite that checks more than one tier being ownable by no Module, and from a refused config producing no document for any Module to own.

**§2's coverage and closure** are held by `src/packages/conformance/tests/frontmatter-tier.test.ts` — an `it.each` loop per vocabulary tier plus one closure test per tier. It is a vitest suite, and it fails the moment a tier's config stops exercising the vocabulary or carries a key outside it. §2.2 exists because either half alone is blind: the named-format tier once had coverage and no closure test, so `format: datetiem` failed nothing.

**§3.2 refuses an unpinned suite** because a freshness assertion against the wall clock is green tomorrow for a different reason than it was green today.

**§3's pinned instant** is `ASSESSMENT_INSTANT` in each tier's runner, the only instant that tier's Assessment half is judged against.

**Manual review duties** (never linted): a hand-stated case count was actually re-counted rather than incremented on faith (§1.3); this Package was not quietly enrolled in the declared Module set (§1.4).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Conformance Suite](./ARCH-002-conformance-suite.md) — the `fixtures/conformance/**` half of this record.
- [Conformance Contract Proofs](./ARCH-011-conformance-contract-proofs.md) — the fault-catalog pin extracted from this record and the two-sided translation proof beside it.
- [Module Boundaries](./ARCH-008-module-boundaries.md) — the declared Module set that §1.4 defers to.
- [Testing](./ARCH-003-testing.md) — the runner conventions these suites sit inside.
- [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md) — Disciplines are grouped by glob, which is why this record exists.
