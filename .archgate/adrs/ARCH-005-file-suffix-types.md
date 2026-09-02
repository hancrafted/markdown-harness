---
type: adr
id: ARCH-005
title: 'The types Classifier'
domain: architecture
rules: false
files: ['src/**/*']
paths: ['src/**/*.types.*']
description: 'What the types classifier claims: every exported type declaration lives in a types file, that file holds declarations and no runtime value, private local types stay beside their consumer, and the ambient declaration extension stays unreached.'
---

# The types Classifier

## Context

A **type declaration** is the TypeScript construct — an `interface`, a `type` alias, or an `enum`.

The Discipline is stated as a ban rather than a requirement, because the violation happens in the _other_ file: an exported declaration is misplaced by the author of the implementation file, not by the author of the `types` file. That is why this record checks broadly and steers narrowly.

## Decision

### 1. Where an exported type declaration lives

1. Every exported type declaration MUST live in a file carrying the `types` classifier.
2. A **private local type** beside its only consumer is better locality and MUST NOT be moved.
3. Re-exporting a type declaration from an entry point through a source — the `export type { Span } from './span.types'` form — is the intended idiom and is admitted.

### 2. What a types file may hold

1. A `types` file MUST hold exported type declarations and nothing else.
2. It MUST NOT export a runtime value: no function, no class, no constant.
3. It MUST NOT carry a runtime import. A type-only import is admitted; anything else makes a declaration file a link in the dependency graph, which is the property this classifier exists to deny.
4. It MUST NOT hold an executable statement.

### 3. The reserved extension

1. The ambient declaration extension `.d.ts` MUST NOT be used for a Package's own types. A `types` file is an ordinary source file with ordinary exports, imported explicitly by everything that needs it.

## Do's and Don'ts

### Do's

1. **DO** move an exported type declaration into a `types` file. (Decision 1)
2. **DO** leave a private local type beside its only consumer. (Decision 1)
3. **DO** re-export a type declaration from an entry point to give a Package one public shape. (Decision 1)
4. **DO** keep a `types` file to declarations, so it stays readable as a whole. (Decision 2)
5. **DO** use a type-only import inside a `types` file when one declaration references another. (Decision 2)
6. **DO** write an ordinary source file, imported explicitly, rather than an ambient one. (Decision 3)

### Don'ts

1. **DON'T** export an `interface`, `type` alias or `enum` from a file that does not carry the `types` classifier. (Decision 1)
2. **DON'T** export a local type by specifier from an implementation file — the specifier form is the same violation in different syntax. (Decision 1)
3. **DON'T** put a function, class or constant in a `types` file. (Decision 2)
4. **DON'T** add a runtime import to a `types` file. (Decision 2)
5. **DON'T** reach for `.d.ts` to hold a Package's own type declarations. (Decision 3)

## Consequences

**Positive:**

1. **One address for the shape:** a reader finds a Package's exported types by listing files, not by grepping exports.
2. **No ambient reach:** every type dependency is an explicit import, keeping the dependency graph visible to tooling.

**Negative:**

1. **The file's contents are unchecked:** the ban keeps declarations out of other files, but nothing stops a `types` file from growing logic.
2. **Enums emit runtime code:** an `enum` counts as a type declaration here, so a `types` file carrying one is not erased at build time. The classifier's name over-promises for that one construct.

**Risks:**

1. **Re-export inspection hole:** a type re-exported through a source is uninspected, trusting the `types` file. **Mitigation:** specifier exports without a source are caught.
2. **A `types` file becomes a dumping ground:** one shape address invites misplaced logic. **Mitigation:** Decision 2 bans runtime values, enforced as a review duty.

## Compliance and Enforcement

**Enforcer per Discipline.** Decision 1 is held in `eslint.config.mjs` by core `no-restricted-syntax`, through six selectors in four forms, applied to every governed file _except_ those carrying the `types` classifier: an exported `TSInterfaceDeclaration`, `TSTypeAliasDeclaration` or `TSEnumDeclaration` — one selector each — a default-exported interface, and a local type exported by specifier in both of its spellings. The narrowing to `ExportNamedDeclaration` rather than the bare node type is what keeps a private local type legal, and `[source=null]` is what keeps the re-export idiom legal. The block is restated in the test-file configurations, because flat config overrides rule options rather than merging them, and omitting it would silently disarm the ban there.

**Not mechanically enforced — review duty:** the whole of Decision 2. No configured check inspects a `types` file's contents, because that file is excluded from the ban that would see them. A reviewer must confirm the file holds declarations only, carries no runtime import, and exports no value. Decision 3 is likewise a review duty — nothing rejects a `.d.ts` that an author adds.

**Known reach gap.** The configured selectors run over `src/packages/**/*.ts`, and are restated for every test file in the repository whatever directory it sits in — so the ban already reaches test files outside the packages root. What it does not reach is non-test source outside `src/packages/`, and files that are not TypeScript. The first closes when the remaining source moves into a Package.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [TypeScript — declaration files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html) — what an ambient `.d.ts` does and why the compiler loads it without an import.
- [TypeScript — type-only imports and exports](https://www.typescriptlang.org/docs/handbook/modules/reference.html#type-only-imports-and-exports) — the `import type` and `export type` forms, and what each erases.
- [ESLint — `no-restricted-syntax`](https://eslint.org/docs/latest/rules/no-restricted-syntax) — the selector mechanism the four bans are written in.
