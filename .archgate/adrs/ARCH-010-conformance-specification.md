---
type: adr
id: ARCH-010
title: 'Conformance Specification'
domain: architecture
rules: false
files: ['fixtures/conformance/**']
paths: ['fixtures/conformance/**']
description: 'The permanent specification carried by Conformance inputs and frozen expectations, including the two old-grammar halves of a selector translation.'
---

# Conformance Specification

## Context

The Conformance suite is both executable coverage and the portable specification promised by architecture tenet 4. Those duties fail differently: coverage may be regenerated when vocabulary grows, while a frozen answer exists to disagree with new code. Treating both as test data lets a failing expectation be rewritten into agreement or deleted while every remaining check stays green. This record governs how those fixture bytes are maintained; the bytes themselves, not this internal ADR, remain the portable contract.

The selector migration makes the distinction measurable. Real files prove where a selector reaches but cannot express where it stops. Its translation guard therefore needs a second half made of witness paths with no document behind them. Both frozen halves live under `fixtures/conformance/`; [ARCH-011](./ARCH-011-conformance-contract-proofs.md) governs the source-side proof that reads them.

This record extracts the permanent-specification Discipline from ARCH-002 along the fixture glob both records need. The split allowed by [design-ADR 0002](../../docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md) separates general corpus shape from this project's choice to freeze executable contract answers; a reviewer already distinguishes a marker-format edit from a changed answer.

## Decision

### 1. Frozen Conformance contract

1. Each corpus tier's config, stated Conformance-case outcomes and golden expectations MUST be treated as specification, never ordinary test data.
2. Changing or deleting one of those artifacts MUST be reviewed as a contract change. Moving one without changing its bytes is not a contract change.
3. Deletion MUST NOT be accepted because remaining checks pass; the source-side proof MUST carry a hand-stated count or closure assertion that makes the missing artifact fail.

### 2. Two-sided translation guard

1. A selector-grammar translation MUST retain both halves: corpus attribution proving where selectors reach and witness cases proving where they stop.
2. A witness MUST name a path with no document behind it, inside a folder the tier actually has. It MUST NOT become an ordinary corpus file.
3. `corpus-attribution.json` and `witness-cases.json` MUST remain frozen from the grammar migrated from. Neither file may be generated from, or rewritten to agree with, the implementation it checks.
4. A deliberately accepted divergence MUST name the migration unit that authorises it.

## Do's and Don'ts

### Do's

1. **DO** review a changed config, marker or golden expectation as a contract diff. (Decision 1)
2. **DO** keep `corpus-attribution.json` and `witness-cases.json` beside their tier config. (Decision 2.4)
3. **DO** keep witness paths absent while retaining their parent folders. (Decision 2.2)
4. **DO** name every accepted divergence with `divergesFrom`. (Decision 2.4)
5. **DO** pair a deleted frozen row with the source-side proof change that makes deletion visible. (Decision 1.3)

### Don'ts

1. **DON'T** update a frozen expectation merely to make new output pass. (Decision 1.1, 2.4)
2. **DON'T** derive either translation half from the two-axis selector implementation. (Decision 2.4)
3. **DON'T** delete one half because the other still describes valid answers. (Decision 2.1)
4. **DON'T** create a document at a witness path. (Decision 2.2)
5. **DON'T** accept deletion based only on the surviving test set. (Decision 1.3)

## Consequences

### Positive

- **Non-tautological migration proof.** Old-grammar answers can disagree with new code instead of echoing it.
- **Widening detection.** Witnesses express absence that a real file tree structurally cannot.
- **Portable contract.** JSON expectations remain readable by a reimplementation without this TypeScript toolchain.
- **Reviewable deletion.** ARCH-011's counts and closure turn a missing frozen artifact into a failure.

### Negative

- **Duplicate-looking evidence.** Corpus and witness halves resemble two lists of selector answers even though they prove opposite boundaries.
- **Manual upkeep.** Contract changes require reviewed edits to frozen files and their hand-stated counts.
- **One more fixture-scoped record.** A Conformance fixture read loads corpus-shape governance and frozen-contract governance together.

### Risks

- **A witness silently becomes a file.** The negative half then duplicates the weaker corpus half. **Mitigation:** `selector-translation.test.ts` asserts that no witness path exists.
- **A widened selector leaves real files unchanged.** The corpus half stays green. **Mitigation:** ARCH-011 requires the witness half to fail independently.
- **A frozen file shrinks with no disagreement.** Remaining rows still pass. **Mitigation:** ARCH-011 pins both comparison counts and checks corpus attribution against the walked tree.

## Compliance and Enforcement

**Automated enforcement:** [ARCH-011](./ARCH-011-conformance-contract-proofs.md) governs `src/packages/conformance/tests/selector-translation.test.ts`, which compares all 40 frozen corpus attributions and all 28 frozen witnesses independently. It also asserts that every corpus file has an attribution, no witness exists, every witness parent folder exists, both hand-stated counts hold, and every accepted divergence is named.

The frozen inputs are `fixtures/conformance/frontmatter/valid-test-config.yaml`, `corpus-attribution.json` and `witness-cases.json`. Their answers predate the two-axis implementation. `src/packages/conformance/selector-translation.ts` and `lib/translation/frozen-answers.impure.ts` only read them; neither computes expected answers from current selectors.

**Manual review duties:** verify every frozen-file edit against the migrated-from grammar or an explicitly named divergence; treat deletion as a contract change even when surviving rows remain green; confirm each witness still names absence inside a real folder.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Conformance Suite](./ARCH-002-conformance-suite.md) — corpus shape, marker grammar and vocabulary closure.
- [Conformance Contract Proofs](./ARCH-011-conformance-contract-proofs.md) — the source-side assertions that keep frozen expectations independent and complete.
- [Conformance Runners](./ARCH-009-conformance-runners.md) — general runner enrolment and anti-vacuity disciplines.
- [design-ADR 0007](../../docs/design-adr/0007-selector-is-two-literal-axes.md) — the selector migration whose old grammar froze these answers.
- [Architecture vision](../../docs/vision/architecture.md) — tenet 4 declares the fixture contract portable.
