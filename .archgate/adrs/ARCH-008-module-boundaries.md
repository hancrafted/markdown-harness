---
type: adr
id: ARCH-008
title: 'Module Boundaries'
domain: architecture
rules: false
files: ['src/**/*']
paths: ['src/**/*']
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
3. Any Package MAY import `config-contract`, type-only. A Module imports that claim vocabulary and no other Module's entry point.
4. A Module's config section type MUST live in that Module's Package; no Package outside it may name that type.
5. `claimsFor` MUST be handed its own Module's validated section and nothing else, so no Module can project an extent derived from a document's content.

### 2. The platform gate

1. Only `foundation` MAY import a platform builtin; every other Package MUST reach the filesystem through it.
2. Inside `foundation`, a builtin import MUST sit in `lib/platform/`.
3. Test files at the two homes `ARCH-003-testing` Decision 4 names are exempt from both.

### 3. Registration

1. A Module MUST reach the Core only through a `ModuleDescriptor` at the declared extension point.
2. The recognised top-level key set MUST derive from the declared Module set, never from a literal list.

### 4. Composition

1. `cli` MUST be the only Package that composes a Module with the Core.

### 5. Where a cross-Module comparison runs

1. A comparison both of whose extents are written in the config MUST run once, at load, in Core.
2. A comparison either of whose extents is derived from a file's content MUST NOT run in Core: it is one Module's finding about one file, reported as a violation on that file under that Module's own codes.

## Do's and Don'ts

### Do's

1. **DO** declare a Module's needs in the Core's vocabulary, and take that vocabulary as given. (Decision 1)
2. **DO** keep a Module's section type inside that Module's Package. (Decision 1)
3. **DO** reach the filesystem through `foundation`, whose builtin imports sit in `lib/platform/`. (Decision 2)
4. **DO** register a Module by adding a `ModuleDescriptor` to the declared Module set, and derive the recognised top-level keys from it. (Decision 3)
5. **DO** compose Modules with the Core in `cli`, nowhere else. (Decision 4)
6. **DO** report a content-derived finding as that Module's violation on the file. (Decision 5)

### Don'ts

1. **DON'T** import another Module Package, or name another Module's section type. (Decision 1)
2. **DON'T** let `foundation` import a Module. (Decision 1)
3. **DON'T** hand `claimsFor` anything but its own Module's validated section. (Decision 1)
4. **DON'T** import a platform builtin outside `foundation`, type-only imports included. (Decision 2)
5. **DON'T** hardcode the recognised top-level keys, or compose a Module outside `cli`. (Decisions 3, 4)
6. **DON'T** raise a config fault for a comparison whose extent came from a document. (Decision 5)

## Consequences

**Positive:**

1. **A Module is addable without editing Core.** Core compares claims and never parses a section, so a fourth Module costs its own Package plus one list entry.
2. **The check stays hermetic.** Decision 5 keeps every config comparison a function of config text.

**Negative:**

1. **A permanent hand-written residue.** What the shared vocabulary cannot express stays a hand-written Core check — accepted, not a gap to close.

**Risks:**

1. **The Module list is hand-maintained**, so a new Module is unguarded until added. **Mitigation:** it is a literal in `.dependency-cruiser.cjs`, so adding one is a reviewed edit inside the enforcing file.
2. **`dependencyTypes` sees imports, never globals.** **Mitigation:** carried below as a standing review duty rather than claimed as held.

## Compliance and Enforcement

**Enforcer per Discipline.** `dependency-cruiser` holds Decisions 1 and 2 at `error`. `modules-never-import-modules` holds §1.1 from an explicit Module list, not a naming convention; `only-the-gate-imports-a-builtin` holds §2.1 and `gate-builtins-sit-in-platform` holds §2.2, both written `to: { dependencyTypes: ['core'] }` — dependency-cruiser's word for a Node builtin, never this repo's Core. Test files are carved out of both because `ARCH-003-testing` Decision 1.2 forbids `vi.mock`, so a suite proving a symlink case must plant one; the carve-out matches that record's two homes and no wider. A type-only import is caught only while `tsPreCompilationDeps: true` (trap 5), so read the dependency count, never the checkmark, and canary by **rule name** — `pure-imports-no-builtin` already forbids the same edge out of a `.pure.ts` file.

**Review duty, not mechanical.** Decisions 3, 4 and 5, and the globals hole: `globalThis.process`, a laundered `require` and a computed specifier are invisible to `dependencyTypes`. Decision 1.5 rests on `claimsFor`'s signature plus one call site — the type system was measured unable to catch a cross-wired section — so the guard is that call site and two loader unit tests. A `module-descriptor-is-pure` rule, barring the file that declares a `ModuleDescriptor` from reaching an `.impure.ts`, is measured firing and owed to Phase 1.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Folders and Files](./ARCH-004-folders-and-files.md) — the Package tree and import boundaries any project with this layout holds.
- [Testing](./ARCH-003-testing.md) — Decision 4's two test homes, which the builtin carve-out matches.
- [The impure Classifier](./ARCH-007-file-suffix-impure.md) — `pure-imports-no-builtin`, the neighbouring rule.
- [Eric Evans — DDD Reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf) — _Conformist_: adhere to the upstream model rather than translate it.
