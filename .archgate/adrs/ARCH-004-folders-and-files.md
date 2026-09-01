---
type: adr
id: ARCH-004
title: 'Folders and Files'
domain: architecture
rules: false
files: ['src/**/*']
paths: ['src/**/*']
description: 'Where a source file may sit and what it may be called: the Package tree, exactly one classifier per file by position then suffix, the import boundaries, subject naming, and the stop protocol when the vocabulary has no slot.'
---

# Folders and Files

## Context

This ADR serves to orient an agent on how to architect, structure, and write files within the `src/` source folder.

## Decision

### 1. The source tree

1. Every source file under `src/` MUST sit in a **Package**: one folder under `src/packages/`, flat. A Package MUST NOT contain another Package.
2. A Package's **root files** are its entry points and are public. Everything in a subfolder is private. A Package's internals MAY nest as deep as needed.
3. Each packages MAT hold its own agent instructions — `AGENTS.md` and the `CLAUDE.md` symlink pointing at it.
4. A Package MAY expose several small entry points. A barrel that re-exports a whole subtree is banned; re-exporting a type declaration from an entry point is the intended idiom.

**Example 1**:

```text
src/packages/
    <pkg>/
    AGENTS.md         ← agent instructions
    CLAUDE.md         ← symlink to AGENTS.md
    index.ts          ← public entry point
    lib/              ← private internals (nested as needed)
        impl.pure.ts
        impl.test.ts
        feat.impure.ts
        span.types.ts
        <feature-name>/ ← interal feature (nested as needed)
            feat-name.impure.ts
            feat-name.pure.ts
            feat-name.test.ts
            feat-name.type.ts
    tests/            ← private integration suite
        example.test.ts
```

### 2. Private source files must have exactly one suffix as classifier

1. **Position decides the public surface; the suffix decides the discipline inside.**
2. A Package root file MUST be kebab-case with no suffix and no dot.
3. Every file below a Package root MUST carry exactly one of `.pure`, `.impure`, `.types`, `.test`.
4. No stacking and no escape: a doubled suffix fails, an unclassified subfolder file fails, and a classified file at a Package root fails.
5. A file under the packages root that is neither an entry point nor a classified subfolder file MUST fail outright.

### 3. Import boundaries

1. Code outside a Package MUST import only through its entry points, while a Package's internal files import each other freely.
2. A Package's `tests/` folder is fully private (unimportable from outside) and MUST reach any Package (its own included) only through entry points and local fixtures.
3. A `*.test` file below a Package root MAY import exactly one internal: its same-directory sibling of the same base name carrying `.pure`. Anything wider is a loophole, because renaming a file lifts every restriction.
4. No dependency cycles.

### 4. Naming

1. Every file name MUST be kebab-case.
2. Group functions by **subject**, never by mechanism. `utils`, `common`, `helpers` and `misc` are banned as names: they tell a caller nothing, so they accumulate whatever nobody could place.
3. `.adapter` and `.orchestrator` are NOT classifiers and MUST NOT appear as suffixes. **Adapter** survives as a `codebase-design` glossary term for the role a file plays, not for how it is named.

### 5. When the vocabulary has no slot

1. **Stop.** Do not guess, do not add a second suffix, and do not park the file at a Package root to dodge the choice.
2. Open a `needs-triage` issue naming the file and the discipline it needs. The count of those issues is the evidence that this vocabulary is wrong, and it is the only evidence that ever arrives.

## Do's and Don'ts

### Do's

1. **DO** put every source file in a flat Package under `src/packages/`, exposing its public surface via root entry points. (Decision 1)
2. **DO** expose several small entry points rather than re-exporting whole subtrees. (Decision 1)
3. **DO** name Package root files in kebab-case with no suffix and give every subfolder file exactly one classifier (`.pure`, `.impure`, `.types`, `.test`). (Decision 2)
4. **DO** import another Package only through its entry points. (Decision 3)
5. **DO** keep a colocated test to its same-directory, same-name `.pure` sibling and integration tests under `tests/`. (Decision 3)
6. **DO** name a file after the subject it serves. (Decision 4)
7. **DO** stop and open a `needs-triage` issue when no classifier fits. (Decision 5)

### Don'ts

1. **DON'T** nest Packages or place source files directly at `src/packages/`. (Decision 1)
2. **DON'T** add a barrel that re-exports a whole subtree. (Decision 1)
3. **DON'T** stack classifiers, leave a subfolder file unclassified, or classify a Package root file. (Decision 2)
4. **DON'T** import another Package's internals, reach into any `tests/` folder from outside, or introduce dependency cycles. (Decision 3)
5. **DON'T** name a file `utils`, `common`, `helpers` or `misc`, and don't use `.adapter` or `.orchestrator` as a suffix. (Decision 4)
6. **DON'T** invent a suffix or park an unplaceable file at a Package root. (Decision 5)

## Consequences

**Positive:**

1. **Deep modules with clear traversable surface:** A small public surface over private internals provides agents with clear, predictable entry points to navigate without leaking implementation details.
2. **Glob-addressable files for ADR governance:** Uniform positions and classifier suffixes allow exact glob matching, ensuring mechanical checks and ADR governance reach files immediately.

**Negative:**

1. **Subsystem grouping overhead:** Because Packages are strictly flat and cannot nest, composing subsystems requires an explicit third package that imports across them.
2. **Rename friction on discipline change:** Changing a file's internal discipline (e.g. pure to impure) renames its suffix, requiring every import of it to be updated.

**Risks:**

1. **The suffix set is closed on no measured evidence.** Four classifiers may not partition real code, and the pressure appears as authors reaching for the nearest fit. **Mitigation:** the stop protocol in Decision 5 routes every misfit to a `needs-triage` issue, and that count is the amendment trigger.

## Compliance and Enforcement

**Enforcer per Discipline.** The tree shape and the import boundaries (Decisions 1 and 3) are held by the six named rules in `.dependency-cruiser.cjs` — `entrypoint-boundary-from-app`, `entrypoint-boundary-across-packages`, `tests-through-entrypoints`, `colocated-test-lane`, `tests-folder-is-private` and `no-circular` — all at `error`, run by `npm run lint:boundaries` inside `npm run verify`. The classifier vocabulary (Decision 2) is held in `eslint.config.mjs` by `check-file/filename-naming-convention` over two keys, plus a core `no-restricted-syntax` `Program` selector that fails any file matching neither key; both read the same glob constants, which is what keeps them from disagreeing. Kebab-case (Decision 4, item 1) is held by the same `check-file` key.

**Not mechanically enforced — review duty:** that a name states its subject rather than a mechanism (Decision 4, item 2); that a barrel has not been reintroduced under a legal file name (Decision 1, item 4); that an author stopped rather than guessed when no classifier fit (Decision 5).

**Exceptions:** raise a separate ADR; human approval required.

## References
