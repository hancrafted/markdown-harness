---
type: adr
id: ARCH-008
title: 'Module Boundaries'
domain: architecture
rules: false
files: ['src/**/*', 'evals/**/*']
paths: ['src/**/*', 'evals/**/*']
description: 'Which way dependencies run between a Module, the shared foundation Package and cli: no Module imports another, only the gate reaches a platform builtin, a Module registers through one port, cli alone composes, and where a cross-Module comparison runs.'
---

# Module Boundaries

## Context

The tool grows by adding Modules — `frontmatter-harness` today, `indexes-harness` and `drift-detection` next — each owning one top-level key of the config. `ARCH-004-folders-and-files` holds what any project with this layout would do. **Which way the dependencies run is this product's own choice** — another project may legitimately have its Core import its Modules — so it splits out rather than joining that record, per consequence 9 of `0002-archgate-records-disciplines-scoped-by-glob`.

A Module is a bounded context, conformist to the Core (Evans): it declares what it needs in the Core's vocabulary and builds no translation layer. No clause below turns on that reading, but it is why Core adjudication is the only arrangement available. **Core** is the role every non-Module Package fills; `foundation` is the one Package the Modules share, and the only one that reaches the filesystem.

## Decision

### 1. Dependency direction

1. A Module Package MUST NOT import another Module Package, at any depth, through any entry point.
2. `foundation` MUST NOT import a Module Package.
3. Any Package MAY import `config-contract`, type-only; a Module imports no other Module's entry point.
4. A Module's section type, requirement and violation shapes and codes MUST live in its Package; no outside Package may name them, by import or in writing (`ARCH-012-module-free-contracts`).
5. `validateSection` MUST receive only its own Module's section, and `LoadedConfig.sectionFor` MUST return only the section stored under that descriptor's identity, so no Module projects an extent derived from a document's content.

### 2. The platform gate

1. Each tree has one platform gate: `foundation` in `src/`, `platform` in `evals/`. Only a gate MAY import a builtin; its tree's other Packages MUST reach the host through it.
2. Inside a gate, a builtin import MUST sit in `lib/platform/`.
3. `foundation` MUST NOT import `child_process`, `os`, `net`, `http`, `https` or `dns`, or call `fetch`; the `evals/` gate MAY.
4. Tests at `ARCH-003-testing`'s two homes are exempt from 1 and 2.

### 3. Registration

1. A Module MUST reach the Core only through a `ModuleDescriptor` at the declared extension point.
2. The recognised top-level key set MUST derive from the declared Module set, never from a literal list.

### 4. Composition

1. `cli` MUST be the only Package that composes a Module with the Core.
2. `cli` MUST derive the concrete response from the declared Module set.

### 5. Where a cross-Module comparison runs

1. A comparison both of whose extents are written in the config MUST run once, at load, in Core.
2. A comparison with an extent derived from a file's content MUST NOT run in Core: it is that Module's violation on that file.

### 6. Import direction between the trees

1. `src/` and `evals/` MUST NOT import each other; `evals/` reaches `mh` only through the compiled CLI.

## Do's and Don'ts

### Do's

1. **DO** declare a Module's needs in the Core's vocabulary, and take that vocabulary as given. (Decision 1)
2. **DO** keep a Module's section type, requirement and violation shapes and codes inside that Module's Package. (Decision 1)
3. **DO** reach the filesystem through the tree's gate, whose builtin imports sit in `lib/platform/`. (Decision 2)
4. **DO** run `mh` from `evals/` as the compiled CLI in `dist/`. (Decision 6)
5. **DO** register a Module by adding a `ModuleDescriptor` to the declared Module set, and derive the recognised top-level keys from it. (Decision 3)
6. **DO** compose Modules with the Core in `cli`, nowhere else, deriving the concrete response from the declared Module set. (Decision 4)
7. **DO** report a content-derived finding as that Module's violation on the file. (Decision 5)

### Don'ts

1. **DON'T** import another Module Package, or name another Module's section type or shapes — Core included. (Decision 1)
2. **DON'T** let `foundation` import a Module. (Decision 1)
3. **DON'T** hand `validateSection` anything but its own Module's raw section, or return a section through `LoadedConfig.sectionFor` under another descriptor's identity. (Decision 1)
4. **DON'T** import a platform builtin outside the tree's gate, type-only imports included. (Decision 2)
5. **DON'T** hardcode the recognised top-level keys, or compose a Module outside `cli`. (Decisions 3, 4)
6. **DON'T** raise a config fault for a comparison whose extent came from a document. (Decision 5)
7. **DON'T** spawn, call `fetch` or import `os` from `foundation`. (Decision 2)
8. **DON'T** import across `src/` and `evals/` in either direction. (Decision 6)

## Consequences

**Positive:**

1. **A Module is addable without editing Core.** Core compares claims, never parses a section and names no Module's shape, so a fourth Module costs its own Package plus one entry in the Module set. The words claim and extent in that comparison, and in Decision 5, are the superseded projection in design-ADR 0008, not the glossary's claim. That comparison is a target, not a check the code holds; this does not retract Decision 5.
2. **The check stays hermetic.** Decision 5 keeps every config comparison a function of config text.

**Negative:**

1. **A permanent hand-written residue.** What the shared vocabulary cannot express stays a hand-written Core check — accepted, not a gap to close.

**Risks:**

1. **The Module list is hand-maintained**, so a new Module is unguarded until added. **Mitigation:** it is a literal in `.dependency-cruiser.cjs`, so adding one is a reviewed edit inside the enforcing file.
2. **`dependencyTypes` sees imports, never globals.** **Mitigation:** carried below as a standing review duty rather than claimed as held.

## Compliance and Enforcement

**Enforcer per Discipline.** `dependency-cruiser` holds Decisions 1 and 2 at `error`. `modules-never-import-modules` holds §1.1 from an explicit Module list, not a naming convention; `only-the-gate-imports-a-builtin` holds §2.1 and `gate-builtins-sit-in-platform` holds §2.2, `foundation-never-spawns` holds §2.3's imports (`fetch` is a global and a review duty), both written `to: { dependencyTypes: ['core'] }` — dependency-cruiser's word for a Node builtin, never this repo's Core. `src-never-imports-evals` and `evals-never-imports-src` hold Decision 6. Test files are carved out of the first two because `ARCH-003-testing` Decision 1.2 forbids `vi.mock`, so a suite proving a symlink case must plant one; the carve-out matches that record's two homes and no wider. A type-only import is caught only while `tsPreCompilationDeps: true` (trap 5), so read the dependency count, never the checkmark, and canary by **rule name** — `pure-imports-no-builtin` already forbids the same edge out of a `.pure.ts` file.

**Review duty, not mechanical.** Decisions 3, 4 and 5, and the globals hole: `globalThis.process`, a laundered `require` and a computed specifier are invisible to `dependencyTypes`. Decision 1.5 rests on `src/packages/foundation/lib/config/module-sections.pure.ts` (lines 39-44 writing the section map and lines 60-68 reading it) and its colocated suite `module-sections.test.ts` — the type system was measured unable to catch a cross-wired section, so the guard is those call sites plus the suite proving two descriptors cannot receive or read each other's section. The `module-descriptor-is-pure` rule, barring the file that declares a `ModuleDescriptor` from reaching an `.impure.ts`, is a target owed to a later phase rather than a guard held today (measured firing).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Folders and Files](./ARCH-004-folders-and-files.md) — the Package tree and import boundaries any project with this layout holds.
- [Testing](./ARCH-003-testing.md) — Decision 4's two test homes, which the builtin carve-out matches.
- [The impure Classifier](./ARCH-007-file-suffix-impure.md) — `pure-imports-no-builtin`, the neighbouring rule.
- [Eric Evans — DDD Reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) — _Conformist_: adhere to the upstream model rather than translate it.
- [Module-Free Contracts](./ARCH-012-module-free-contracts.md) — Decision 1.4's written-out half, held by `contracts-name-no-module`.
