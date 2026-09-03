---
type: adr
id: ARCH-004
title: 'Folders and Files'
domain: architecture
rules: false
files: ['src/**/*']
paths: ['src/**/*']
description: 'Where a source file may sit and what it may be called: the Package tree, exactly one classifier per file by position then suffix, the import boundaries, and subject naming.'
---

# Folders and Files

## Context

This ADR serves to orient an agent on how to architect, structure, and write files within the `src/` source folder.

**Example Shape**:

```text
src/packages/
    AGENTS.md                 ← agent instructions for the packages root
    CLAUDE.md                 ← symlink to AGENTS.md
    <package-name>/
        AGENTS.md             ← optional, per Package
        CLAUDE.md             ← symlink to AGENTS.md
        index.ts              ← public entry point
        lib/                  ← private internals (nested as needed)
            impl.pure.ts.     ← deterministic functions
            impl.test.ts.     ← test for deterministic functions, TDD
            feat.impure.ts.
            span.types.ts
            <feature-name>/   ← internal feature (nested as needed)
                feat-name.impure.ts
                feat-name.pure.ts
                feat-name.test.ts
                feat-name.types.ts
        tests/                ← private integration suite
            example.test.ts
```

## Decision

### 1. The source tree

1. Every source file under `src/` MUST sit in a flat, non-nested **Package** directly under `src/packages/`.
2. A Package's root files are its public entry points; all files in subfolders are private internals (which MAY nest as needed).
3. `src/packages/` MUST hold only Package folders and agent instructions (`AGENTS.md`/`CLAUDE.md`), never source files; Packages MAY hold that same pair.
4. A Package MAY expose multiple narrow entry points; barrel files re-exporting entire subtrees are forbidden.

### 2. Private source files must have exactly one suffix as classifier

1. **Position decides the public surface; the suffix decides the discipline inside.**
2. A Package root file MUST be kebab-case with no suffix and no dot. The agent instruction pair named in Decision 1 is exempt.
3. Every file below a Package root MUST carry exactly one of
   - `.pure` (result is a function of its arguments alone)
   - `.impure` (everything else: procedures, adapters, and the code that wires them)
   - `.types` (exported type declarations, nothing else)
   - `.test` (testing only)
4. No stacking and no escape: a doubled suffix fails, an unclassified subfolder file fails, and a classified file at a Package root fails.
5. A file under the packages root that is neither an entry point, a classified subfolder file, nor the agent instruction pair MUST fail outright.

### 3. Import boundaries

1. Packages expose only entry points to outside code; `tests/` is private and reaches Packages only via entry points and local fixtures.
2. Subfolder `*.test` files MAY import only their same-directory, same-name `.pure` sibling. Dependency cycles are forbidden.

### 4. Naming

1. Every file name MUST be kebab-case.
2. Group functions by **subject**, never by mechanism; `utils`, `common`, `helpers` and `misc` are banned.
3. `.adapter` and `.orchestrator` are not classifiers and MUST NOT appear as suffixes.

## Do's and Don'ts

### Do's

1. **DO** put every source file in a flat Package under `src/packages/`, exposing its public surface via root entry points. (Decision 1)
2. **DO** expose several small entry points rather than re-exporting whole subtrees. (Decision 1)
3. **DO** name Package root files in kebab-case with no suffix and give every subfolder file exactly one classifier (`.pure`, `.impure`, `.types`, `.test`). (Decision 2)
4. **DO** import another Package only through its entry points. (Decision 3)
5. **DO** keep a colocated test to its same-directory, same-name `.pure` sibling and integration tests under `tests/`. (Decision 3)
6. **DO** name a file after the subject it serves. (Decision 4)

### Don'ts

1. **DON'T** nest Packages or place source files directly at `src/packages/`. (Decision 1)
2. **DON'T** add a barrel that re-exports a whole subtree. (Decision 1)
3. **DON'T** stack classifiers, leave a subfolder file unclassified, or classify a Package root file. (Decision 2)
4. **DON'T** import another Package's internals, reach into any `tests/` folder from outside, or introduce dependency cycles. (Decision 3)
5. **DON'T** name a file `utils`, `common`, `helpers` or `misc`, and don't use `.adapter` or `.orchestrator` as a suffix. (Decision 4)

## Consequences

**Positive:**

1. **Deep modules with clear traversable surface:** A small public surface over private internals provides agents with clear, predictable entry points to navigate without leaking implementation details.
2. **Glob-addressable files for ADR governance:** Uniform positions and classifier suffixes allow exact glob matching, ensuring mechanical checks and ADR governance reach files immediately.

**Negative:**

1. **Subsystem grouping overhead:** Because Packages are strictly flat and cannot nest, composing subsystems requires an explicit third package that imports across them.
2. **Rename friction on discipline change:** Changing a file's internal discipline (e.g. pure to impure) renames its suffix, requiring every import of it to be updated.

**Risks:**

1. **The suffix set is closed on no measured evidence.** Four classifiers may not partition real code, and the pressure appears as authors reaching for the nearest fit. **Mitigation:** unmatched file roles trigger issues that surface whether the vocabulary requires amendment.

## Compliance and Enforcement

**Enforcer per Discipline.** The tree shape and the import boundaries (Decisions 1 and 3) are held by the six named rules in `.dependency-cruiser.cjs` — `entrypoint-boundary-from-app`, `entrypoint-boundary-across-packages`, `tests-through-entrypoints`, `colocated-test-lane`, `tests-folder-is-private` and `no-circular` — all at `error`, run by `npm run lint:boundaries` inside `npm run verify`. The classifier vocabulary (Decision 2) is held in `eslint.config.mjs` by `check-file/filename-naming-convention` over two keys — `ENTRY_POINTS` and `INTERNALS`, both anchored at `src/packages/` — plus a core `no-restricted-syntax` `Program` selector scoped to `GOVERNED`, anchored one level higher at `src/`. The anchors differ deliberately: governance starts at `src/` so a source file outside every Package is still caught, while the classifier keys stay at the tier where Packages physically sit. What keeps the two from disagreeing is that the net's `ignores` **is** the classifier key set, so the net fires on exactly the files the keys do not classify. Anchoring the keys at `src/` instead shifts every tier and fails in both directions — a stray `src/<folder>/<name>.ts` reads as an entry point, a false pass that hides it from the net, while a real entry point reads as an unclassified internal. Measured, not reasoned: 16 errors with one false, against 3 true errors the correct way. Kebab-case (Decision 4, item 1) is held by the same `check-file` key.

**Not mechanically enforced — review duty:** that a name states its subject rather than a mechanism (Decision 4, item 2); that a barrel has not been reintroduced under a legal file name (Decision 1, item 4).

**Known reach gap.** The six rules named above hold Decisions 1 and 3 only while `.dependency-cruiser.cjs` sets `tsPreCompilationDeps: true`. Without it dependency-cruiser sees post-compilation edges only, so every `import type` and `export type … from` is erased before the rules run — and `config-contract` is types-only, so all six would cruise it and check nothing while `npm run lint:boundaries` still reported success. Measured 2026-09-02: the flag took the tree from 3 to 7 dependencies cruised. The diagnostic is the dependency count on that line, never the checkmark.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [eslint-plugin-check-file](https://github.com/dukeluo/eslint-plugin-check-file) — `filename-naming-convention` matches the basename with the final extension stripped, which is what lets a suffix read as a classifier at all.
- [Go — package names](https://go.dev/blog/package-names) — the "Bad package names" section: `util`, `common` and `misc` "provide clients no sense of what the package contains".
