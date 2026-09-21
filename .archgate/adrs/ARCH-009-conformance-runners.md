---
type: adr
id: ARCH-009
title: 'Conformance Runners'
domain: architecture
rules: false
files: ['src/packages/conformance/**']
paths: ['src/packages/conformance/**']
description: 'The runner half of the Conformance suite in src/packages/conformance/: one runner per corpus tier, tier enrolment, coverage and closure over the config vocabulary, the fault catalog and its compile-time pin, and the pinned assessment instant.'
---

# Conformance Runners

## Context

[ARCH-002](./ARCH-002-conformance-suite.md) governs the corpus — the bytes under `fixtures/conformance/`. This record governs what reads them. The two were one record until the corpus grew a rejected-config tier and the runners moved into a Package of their own; keeping both in one file put it over the ADR size budget, and [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md) settles which way such a record splits: by the glob a Discipline needs, never by topic. A reader editing a runner loads this record; a reader editing a case loads ARCH-002.

The failure this record exists to prevent is a suite that is green over nothing. A runner looping an emptied tier passes. A coverage loop with no closure test beside it passes over a misspelled value. A hand-written fault catalog silently drifts from the code it claims to specify, and the drift shows up as a tier that is one case lighter than the contract — not as a failure. Each Discipline below is the answer to one of those, and each names the channel that actually catches it, because the channels are not interchangeable: **vitest transforms types away without reading them, so a pin that lives in the type system is held by `tsc --noEmit` and by nothing else.**

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

### 3. The fault catalog and its pin

1. The fault catalog MUST be hand-written as `DECLARED_CODES` in `src/packages/conformance/config-fault-catalog.ts`, never generated from `ConfigFaultCode`.
2. The catalog MUST be closed both ways: `satisfies readonly ConfigFaultCode[]` rejects a code the contract never had; a compile-time pin rejects a contract code the catalog omits.
3. That pin MUST be held by `tsc --noEmit` and never by vitest, which strips types without reading them: `unreachedProof: [UnreachedCodes] extends [never] ? true : false = true`, over `UnreachedCodes = Exclude<ConfigFaultCode, (typeof DECLARED_CODES)[number]>`.
4. The **tuple wrappers on both sides of `extends`** MUST NOT be removed: without them the conditional distributes and a partially covered catalog answers `true`.
5. `const unreached: UnreachedCodes[] = []` MUST NOT be used: an empty array literal is assignable to any array type, so it compiles over a missing member.
6. The tier's runner MUST assert both directions against the catalog.

### 4. The pinned assessment instant

1. Each tier's Assessment half MUST be judged against one `ASSESSMENT_INSTANT` pinned in that tier's runner.
2. An unpinned suite MUST be treated as non-existent, not passing.

## Do's and Don'ts

### Do's

1. **DO** give each corpus tier exactly one runner named `<tier>-tier.test.ts`. (Decision 1.1)
2. **DO** derive both the tier directories and the tier names, assert the two sets equal, and assert neither is empty. (Decision 1.2)
3. **DO** state each runner's case count by hand, so an emptied tier fails. (Decision 1.3)
4. **DO** write a closure assertion beside every coverage loop. (Decision 2.1, 2.2)
5. **DO** keep `DECLARED_CODES` hand-written and ordered as the catalog declares it. (Decision 3.1)
6. **DO** keep the tuple wrappers on both sides of `extends` in `unreachedProof`. (Decision 3.4)
7. **DO** run `tsc --noEmit` beside any single-file vitest run that touches the catalog. (Decision 3.3)
8. **DO** assert both catalog directions from the tier's runner. (Decision 3.6)
9. **DO** pin each tier's `ASSESSMENT_INSTANT` in its own runner. (Decision 4.1)

### Don'ts

1. **DON'T** generate the fault catalog from `ConfigFaultCode`. (Decision 3.1)
2. **DON'T** write the pin as `const unreached: UnreachedCodes[] = []` — it enforces nothing. (Decision 3.5)
3. **DON'T** strip the tuple wrappers from the conditional type. (Decision 3.4)
4. **DON'T** rely on vitest to catch a missing catalog member. (Decision 3.3)
5. **DON'T** add a corpus tier without its runner, or leave a runner behind a deleted tier. (Decision 1.1, 1.2)
6. **DON'T** let a coverage loop stand without a closure test. (Decision 2.2)
7. **DON'T** rely on a presence check to prove a value survived parsing. (Decision 2.3)
8. **DON'T** treat this Package as a Module, or move it into one. (Decision 1.4)
9. **DON'T** read the assessment instant from the wall clock or from the config under test. (Decision 4)

## Consequences

### Positive

- **A retirement is one reviewed change.** Deleting a fault code, its case and its catalog entry either compiles as a set or fails naming the line that is out of step.
- **An emptied tier fails.** Enrolment plus a hand-stated case count means the two ways a suite can go green over nothing are both closed.
- **The Package is owned by no Module.** A tier that two Modules govern has somewhere to live, which it does not when the runner sits inside a Module's Package.
- **The pin costs nothing at runtime.** It is a type-level assertion, so it adds no test and no execution time, and it fails at the only moment that matters — compilation.

### Negative

- **The catalog is maintained twice.** A new fault code means an entry here and a case in the tier, deliberately: the drift that costs is the silent one, and the pin makes this drift loud.
- **The pin's shape is not obvious.** Two readers have already reached for the array-literal form, which compiles and enforces nothing; the record has to spell out why the tuple wrappers are there.
- **Two channels, two failures.** A catalog gap fails `tsc --noEmit` and a case gap fails vitest, so a contributor must read which gate spoke before knowing which half is wrong.
- **Hand-stated case counts age.** Adding a case means editing a number in the runner, and the number carries no meaning beyond being reviewed.

### Risks

- **A single-file vitest run hides a catalog gap.** Running one test file green while the catalog is short reads as a pass. **Mitigation:** trap 8 in [`docs/agents/verification.md`](../../docs/agents/verification.md) pairs `tsc --noEmit` with every single-file run, and the full `verify` chain runs both.
- **The pin is deleted as dead code.** `unreachedProof` is exported and never read at runtime, so a hygiene pass or `knip` could take it for an unused export. **Mitigation:** its doc comment states that the type checker is its only reader; removing it is a change to this record.
- **Enrolment passes over two empty sets.** A derivation bug that empties both sides asserts equality successfully. **Mitigation:** §1.2 requires asserting non-emptiness explicitly, and the assertion exists in `tier-enrolment.test.ts`.

## Compliance and Enforcement

**Enforcer per Discipline:** this record has no companion `.rules.ts`, and that is the decision rather than an omission — every Discipline above is held by a channel that already exists and reads more than an archgate rule can. Restating the `ConfigFaultCode` catalog inside a rules file is precisely the drift §3.1 prevents.

**§1.2's enrolment** is held by `src/packages/conformance/tests/tier-enrolment.test.ts`: it derives the tier directories from the fixture tree and the tier names from the `*-tier.test.ts` file names, asserts the two sets equal, and asserts neither is empty — because two empty sets are equal. **§1.3's hand-stated count** exists so an emptied tier fails against a reviewed number rather than passing over nothing. **§1.4** follows from a suite that checks more than one tier being ownable by no Module, and from a refused config producing no document for any Module to own.

**§2's coverage and closure** are held by `src/packages/conformance/tests/frontmatter-tier.test.ts` — an `it.each` loop per vocabulary tier plus one closure test per tier. It is a vitest suite, and it fails the moment a tier's config stops exercising the vocabulary or carries a key outside it. §2.2 exists because either half alone is blind: the named-format tier once had coverage and no closure test, so `format: datetiem` failed nothing.

**Why §3.1 forbids generating the catalog:** a generated list would make coverage and closure agree by construction, and a retired code would leave the tier one case heavier than the catalog it specifies. §3.6's two directions — every declared code reached by a case, and no case naming a code outside the catalog — make retiring a code and deleting its case one reviewed change rather than a silent gap. §4.2 refuses an unpinned suite because a freshness assertion against the wall clock is green tomorrow for a different reason than it was green today.

**§3's catalog** is held by `config-fault-catalog.ts` together with `tsc --noEmit`, and by `src/packages/conformance/tests/rejected-config-tier.test.ts`, which reaches every declared code and names no code outside the catalog. The two halves answer to different gates on purpose: `satisfies` and `unreachedProof` are compile-time, the coverage and closure assertions are run-time, and a change that satisfies one while breaking the other is exactly the change this pairing is here to stop.

**§4's pinned instant** is `ASSESSMENT_INSTANT` in each tier's runner, the only instant that tier's Assessment half is judged against.

**Manual review duties** (never linted): a hand-stated case count was actually re-counted rather than incremented on faith (§1.3); a new fault code arrived with both a catalog entry and a case (§3.6); this Package was not quietly enrolled in the declared Module set (§1.4); the tuple wrappers survived a refactor that touched the conditional type (§3.4).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Conformance Suite](./ARCH-002-conformance-suite.md) — the `fixtures/conformance/**` half of this record.
- [Module Boundaries](./ARCH-008-module-boundaries.md) — the declared Module set that §1.4 defers to.
- [Testing](./ARCH-003-testing.md) — the runner conventions these suites sit inside.
- [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md) — Disciplines are grouped by glob, which is why this record exists.
