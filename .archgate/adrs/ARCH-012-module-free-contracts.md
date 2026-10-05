---
type: adr
id: ARCH-012
title: 'Module-Free Contracts'
domain: architecture
rules: true
files: ['src/packages/config-contract/**', 'src/packages/response-contract/**', 'src/packages/cli/module-set.ts']
paths: ['src/packages/config-contract/**', 'src/packages/response-contract/**']
---

# Module-Free Contracts

## Context

`config-contract` and `response-contract` are the portable surface: the config vocabulary and the shape of everything `mh` writes. `ARCH-008-module-boundaries` keeps Modules from importing each other and keeps a Module's section type inside its Package, but an import ban cannot see a shape written out. Before issue #229 both contracts named every Module that way: the response's `Violation` union listed `body-structure`'s findings, `ModuleClaim.requirements` was a union of both Modules' requirement shapes, `config-contract` declared `frontmatter`'s constraint vocabulary and `body-structure`'s fault codes, and `FIELD_VIOLATION_CODES` lived in the response contract. Adding a Module meant editing Core, which is what ARCH-008 exists to prevent.

Alternatives weighed:

1. **Keep the unions in the contracts.** Every Module edits Core; the boundary holds only for imports.
2. **Runtime type guards in `cli`.** A guard per Module re-checks at run time what the compiler already knows, and a forgotten guard fails open.
3. **Fold the three Core Packages into one.** It hides the problem inside one Package rather than removing it, and issue #229 decision 10 keeps them separate.
4. **Generic contracts, concrete union derived in `cli`.** Chosen: the contracts are parameterised over what a Module owns, and `cli` — already the one composer — computes the union from the declared Module set at compile time.

## Decision

### 1. What the contracts hold

1. `config-contract` and `response-contract` MUST NOT name a Module: no import of a Module Package, no Module config key as a string literal, no identifier carrying a Module's name, no Module-prefixed code. Comments are prose and are not held. (📜 Rule: `contracts-name-no-module`)
2. A shape only one Module produces — its requirement shape, violation shapes, violation codes and config fault codes only its grammar earns — MUST live in that Module's Package.
3. A contract shape that carries Module-owned content MUST be generic over it: a claim over its requirements, a finding block over its violation, a fault over its code.

### 2. Where the concrete union is computed

1. `cli` MUST derive the concrete requirement, violation and fault-code unions from the declared Module set (`src/packages/cli/lib/run/declared-module.types.ts`), never write them out and never narrow them with a runtime guard.
2. Config fault codes keep the `CONFIG_` prefix wherever they are declared; a Module's violation codes carry `<MODULE>__<OUTCOME>`.

## Do's and Don'ts

### Do's

1. **DO** declare a Module's requirement, violation and fault-code shapes in that Module's Package. (Decision 1)
2. **DO** add a type parameter to a contract shape when Module-owned content must travel through it. (Decision 1)
3. **DO** read the concrete union off `MODULE_SET` in `cli`, so a new Module is one Package plus one entry in that set. (Decision 2)

### Don'ts

1. **DON'T** write a Module's key, type name, code or import into either contract Package. (Decision 1, 📜 Rule: `contracts-name-no-module`)
2. **DON'T** widen a contract to a union of Modules' shapes. (Decision 1)
3. **DON'T** recover a Module's shape at run time with a type guard where the compiler can derive it. (Decision 2)

## Consequences

**Positive:**

1. **A Module is one Package plus one set entry.** Its shapes and codes arrive in the response through the derived union; no contract file changes.
2. **The response stays closed.** The derived code union is exhaustive-switchable, so a widened union fails `tsc` in `src/packages/cli/tests/declared-module.test.ts`.
3. **Two Modules cannot mint one code.** Each Module's codes carry its own prefix.

**Negative:**

1. **Generic noise.** Contract shapes and `cli` composers carry type parameters a reader must follow back to `declared-module.types.ts`.
2. **The loader holds fault codes as strings.** It cannot name the union without naming Modules, so the closed fault catalog exists only as `cli`'s derivation, pinned by the rejected-config catalog.

**Risks:**

1. **The rule reads the Module set textually.** A `module-set.ts` that stops importing `'../<package>/module.ts'` would leave nothing to check. **Mitigation:** the rule fails closed — an unreadable set or a descriptor without a readable `key:` is a violation, never a pass.
2. **Comments are not held.** Prose naming a Module passes. **Mitigation:** review duty; comments carry no type and reach no consumer.

## Compliance and Enforcement

**Enforcer per Discipline:** `ARCH-012-module-free-contracts.rules.ts` holds §1.1 at the `error` tier with `contracts-name-no-module`. It derives the Module set from `src/packages/cli/module-set.ts` and each Module's `module.ts` `key:`, blanks comments, and scans every `.ts` file under both contract Packages line by line. It is textual rather than AST-based because archgate transpiles before parsing and `config-contract` is type-only, so an AST rule would see an empty body there (trap 5). `files:` includes `module-set.ts` so a change to the Module set re-runs it. The sibling `.rules.test.ts` proves what the rule decides; reach was proved on the real tree by planting a Module-named type in `response-contract` and watching `archgate check` fail.

**§2.1 is held by the type checker:** `tests/declared-module.test.ts` switches exhaustively over the derived violation-code union, and `conformance/config-fault-catalog.ts` pins its hand-written list against the derived fault-code union from both sides.

**Manual review duties** (never linted): §1.2 and §1.3 — a shape one Module produces is not left generic-in-name but Module-specific in content; comments stay accurate.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Module Boundaries](./ARCH-008-module-boundaries.md) — the import-level boundary this record extends to written-out shapes.
- [The types Classifier](./ARCH-005-file-suffix-types.md) — why the derived unions sit in a `types` file behind a root re-export.
- [Conformance Specification](./ARCH-010-conformance-specification.md) — the frozen goldens that pinned the response byte-for-byte across the move.
- [TypeScript — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — the parameterisation the contracts use.
