---
type: adr
id: ARCH-011
title: 'Conformance Contract Proofs'
domain: architecture
rules: false
files: ['src/packages/conformance/**']
paths: ['src/packages/conformance/**']
description: 'The non-tautological proofs in the Conformance Package: the two-sided selector translation guard and the config-fault catalog pin.'
---

# Conformance Contract Proofs

## Context

ARCH-009 governs the general shape of every Conformance runner: enrolment, coverage with closure, hand-stated counts and pinned time. Two proofs inside the same Package need stronger, project-specific constraints because each can become green by deriving its expectation from the subject it checks.

The selector translation has frozen old-grammar answers in two halves. Its corpus half catches narrowing; only witness paths with no document behind them catch widening. The config-fault catalog has the same independence problem in the type system: generating it from `ConfigFaultCode` makes completeness true by construction, while vitest strips the one pin that can disagree with the union.

This record extracts the fault-catalog Discipline from ARCH-009 and adds the selector guard under the same `src/packages/conformance/**` glob. The boundary follows [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md): ARCH-009 holds runner practices any corpus tier needs; this record holds this project's non-tautological pins against frozen contracts.

## Decision

### 1. Two-sided translation proof

1. `selector-translation.test.ts` MUST compare both frozen halves: real-file attributions proving where selectors reach, and witness answers proving where they stop.
2. The two comparisons MUST fail independently. A widened translation MUST fail the witness comparison even when every corpus attribution remains green.
3. The proof MUST read expectations frozen from the migrated-from grammar; it MUST NOT derive expected answers from the selector implementation under test.
4. It MUST assert that every corpus file has an attribution, no witness path exists, every witness parent folder exists, and both halves retain their hand-stated counts.
5. A deliberately accepted divergence MUST name its migration unit.

### 2. Hand-written fault catalog

1. `DECLARED_CODES` MUST be written by hand in `config-fault-catalog.ts`, never generated from `ConfigFaultCode`.
2. `satisfies readonly ConfigFaultCode[]` MUST reject an entry the contract does not declare.
3. The rejected-config runner MUST assert both directions: every declared code is reached by case bytes, and no frozen expectation names a code outside the catalog.

### 3. Compile-time completeness pin

1. `UnreachedCodes` MUST remain `Exclude<ConfigFaultCode, (typeof DECLARED_CODES)[number]>`.
2. `unreachedProof` MUST remain `[UnreachedCodes] extends [never] ? true : false = true` and be held by `tsc --noEmit`.
3. Tuple wrappers MUST remain on both sides of `extends`; an empty-array pin MUST NOT replace the conditional because an empty literal is assignable to every array type.

## Do's and Don'ts

### Do's

1. **DO** keep corpus and witness comparisons as independently failing assertions. (Decision 1.1, 1.2)
2. **DO** read both expected halves from the frozen JSON files. (Decision 1.3)
3. **DO** retain completeness, absence, parent-folder and hand-count assertions around those halves. (Decision 1.4)
4. **DO** keep `DECLARED_CODES` hand-written and ordered as the contract declares it. (Decision 2.1)
5. **DO** preserve both runtime fault-catalog assertions. (Decision 2.3)
6. **DO** run `tsc --noEmit` beside either targeted Conformance suite. (Decision 3.2)
7. **DO** keep tuple wrappers on both sides of `extends`. (Decision 3.3)

### Don'ts

1. **DON'T** replace witness comparisons with more real corpus files. (Decision 1.1)
2. **DON'T** compute expected selector answers from current selectors. (Decision 1.3)
3. **DON'T** let removal shrink a comparison list under a derived count. (Decision 1.4)
4. **DON'T** generate `DECLARED_CODES` from `ConfigFaultCode`. (Decision 2.1)
5. **DON'T** rely on vitest to catch an omitted contract code. (Decision 3.2)
6. **DON'T** use an empty array literal as the completeness proof. (Decision 3.3)

## Consequences

### Positive

- **Widening detection.** Absence is executable evidence rather than an inference from files that happen to exist.
- **Independent expectations.** Old-grammar JSON and a hand-written catalog can disagree with current implementations.
- **Bidirectional drift detection.** Added, retired, misspelled and deleted contract members fail in a channel that can observe them.
- **Zero runtime pin cost.** Fault-code completeness is checked only during typechecking.

### Negative

- **Duplicate-looking evidence.** Corpus and witness arrays resemble two lists of answers even though they prove opposite boundaries.
- **Duplicate maintenance.** Every fault code is named in the type union, catalog and at least one case.
- **Two failure channels.** Runtime gaps fail vitest while a type-union gap fails `tsc --noEmit`.
- **Non-obvious type expression.** Tuple wrappers look redundant but carry the pin's semantics.

### Risks

- **A widened selector leaves real files unchanged.** The corpus comparison stays green. **Mitigation:** the independent witness comparison is mandatory.
- **A frozen list shrinks silently.** Every surviving row can still pass. **Mitigation:** hand-stated counts and corpus closure fail the deletion.
- **Targeted vitest hides a catalog gap.** Tests can pass while the union has an omitted member. **Mitigation:** run `tsc --noEmit` beside the targeted suite and in the full gate.
- **Hygiene removes the runtime-unused pin.** `unreachedProof` has no runtime reader. **Mitigation:** its exported declaration and this record state that the type checker is its consumer.

## Compliance and Enforcement

**Selector proof:** `tests/selector-translation.test.ts` compares 40 frozen corpus attributions and 28 frozen witnesses independently. It also checks corpus closure, witness absence, real parent folders, hand-stated counts and named divergences. `selector-translation.ts` and `lib/translation/frozen-answers.impure.ts` read expected JSON; neither computes answers from current selectors.

**Fault-catalog proof:** `satisfies readonly ConfigFaultCode[]` rejects unknown catalog entries. `unreachedProof` plus `tsc --noEmit` rejects omitted union members. `tests/rejected-config-tier.test.ts` proves every declared code is produced by case bytes and no frozen expectation names a code outside the catalog.

**Manual review duties:** preserve independent failure paths; verify expected data still originates outside current code; confirm a fault-code change includes union, hand-written catalog, case bytes and golden expectation as applicable; preserve the tuple-wrapped conditional.

**Templates/scaffolding:** none. Frozen expectations and fault cases MUST be authored deliberately rather than generated.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Conformance Specification](./ARCH-010-conformance-specification.md) — fixture-side frozen expectations read by §1.
- [Conformance Runners](./ARCH-009-conformance-runners.md) — general runner Disciplines split from these project-specific proofs.
- [Testing](./ARCH-003-testing.md) — test structure governing both runners.
- [design-ADR 0007](../../docs/design-adr/0007-selector-is-two-literal-axes.md) — the selector migration whose old grammar froze the expected answers.
- [TypeScript conditional types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) — distributivity and tuple-wrapped suppression.
