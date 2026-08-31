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

A file under `src/` declares two things before a reader opens it: what may import it, and what discipline holds inside it. Position answers the first, the classifier answers the second. Both are readable from a directory listing, and both are glob-addressable, which is what lets a governing record reach the author before the file exists rather than a checker reach it afterwards.

The failure this closes is silent non-governance. A file matching no glob loads no record and is judged by nothing, yet reads as governed because the tree around it is. Exhaustiveness is therefore part of the Discipline, not a property of the checker.

Rejected alternative — a folder per role (`pure/`, `types/`). A selected directory selects everything below it forever, including files a later author drops in, so the declaration drifts from the contents without anyone editing it. Rust's `src/bin/` is the worked hazard: the directory name silently changes how its contents compile. A suffix binds to one file and moves with it.

Rejected alternative — governance by review. A tree shape held by habit forks on the first file written by an agent that never read a sibling.

## Decision

### 1. The source tree

1. Every source file under `src/` MUST sit in a **Package**: one folder under `src/packages/`, flat. A Package MUST NOT contain another Package.
2. A Package's **root files** are its entry points and are public. Everything in a subfolder is private. A Package's internals MAY nest as deep as needed.
3. The packages root itself MUST hold only Package folders plus its own agent instructions — `AGENTS.md` and the `CLAUDE.md` symlink pointing at it. It MUST hold no source file.
4. A Package MAY expose several small entry points. A barrel that re-exports a whole subtree is banned; re-exporting a type declaration from an entry point is the intended idiom.

### 2. Exactly one classifier per file

1. **Position decides the public surface; the suffix decides the discipline inside.**
2. A Package root file MUST be kebab-case with no suffix and no dot.
3. Every file below a Package root MUST carry exactly one of `.pure`, `.impure`, `.types`, `.test`.
4. No stacking and no escape: a doubled suffix fails, an unclassified subfolder file fails, and a classified file at a Package root fails.
5. A file under the packages root that is neither an entry point nor a classified subfolder file MUST fail outright. Governance that reports nothing for an unmatched file is not governance.

### 3. Import boundaries

1. Code outside a Package MAY import that Package's entry points and MUST NOT reach into its subfolders.
2. A Package's own files import each other freely; another Package they reach only through its entry points.
3. Files under `<pkg>/tests/` reach any Package through its entry points and their own `tests/` fixtures, never any Package's internals — their own included.
4. A `*.test` file below a Package root MAY import exactly one internal: its same-directory sibling of the same base name carrying `.pure`. Anything wider is a loophole, because renaming a file lifts every restriction.
5. Nothing outside a Package's `tests/` may import anything inside it. The freedom in item 2 stops at the fixtures.
6. No dependency cycles.

### 4. Naming

1. Every file name MUST be kebab-case.
2. Group functions by **subject**, never by mechanism. `utils`, `common`, `helpers` and `misc` are banned as names: they tell a caller nothing, so they accumulate whatever nobody could place.
3. `.adapter` and `.orchestrator` are NOT classifiers and MUST NOT appear as suffixes. **Adapter** survives as a `codebase-design` glossary term for the role a file plays, not for how it is named.

### 5. When the vocabulary has no slot

1. **Stop.** Do not guess, do not add a second suffix, and do not park the file at a Package root to dodge the choice.
2. Open a `needs-triage` issue naming the file and the discipline it needs. The count of those issues is the evidence that this vocabulary is wrong, and it is the only evidence that ever arrives.

## Do's and Don'ts

### Do's

1. **DO** put every source file in a Package under `src/packages/`, with its public surface at the Package root. (Decision 1)
2. **DO** expose several small entry points rather than one large one. (Decision 1)
3. **DO** name a Package root file in kebab-case with no suffix and no dot. (Decision 2)
4. **DO** give every file below a Package root exactly one of `.pure`, `.impure`, `.types`, `.test`. (Decision 2)
5. **DO** import another Package only through its entry points. (Decision 3)
6. **DO** keep a colocated test to its same-directory, same-name `.pure` sibling. (Decision 3)
7. **DO** name a file after the subject it serves. (Decision 4)
8. **DO** stop and open a `needs-triage` issue when no classifier fits. (Decision 5)

### Don'ts

1. **DON'T** nest a Package inside another Package, or put a source file at the packages root. (Decision 1)
2. **DON'T** add a barrel that re-exports a whole subtree. (Decision 1)
3. **DON'T** stack classifiers, leave a subfolder file unclassified, or classify a Package root file. (Decision 2)
4. **DON'T** import another Package's internals, or reach into any `tests/` folder from outside it. (Decision 3)
5. **DON'T** name a file `utils`, `common`, `helpers` or `misc`, and don't reintroduce `.adapter` or `.orchestrator` as a suffix. (Decision 4)
6. **DON'T** invent a suffix, or park an unplaceable file at a Package root. (Decision 5)

## Consequences

**Positive:**

1. **Readable from a listing:** what may import a file, and what holds inside it, are both visible without opening it.
2. **Steerable before the fact:** each classifier is glob-addressable, so a governing record reaches the author rather than the reviewer.
3. **Exhaustive:** a file matching no classifier fails with one clear message instead of passing unexamined.
4. **Deep by construction:** a small public surface over a private interior is the default shape, not an achievement.
5. **One source for two checks:** the naming check and the exhaustiveness net consume the same glob constants, so they cannot drift apart.

**Negative:**

1. **Rename cost:** changing a file's discipline renames the file, so every import of it moves too.
2. **Flat means shallow:** one tier of Packages gives no home for a genuine subsystem grouping; that pressure surfaces as a Package name doing two jobs.
3. **Ceremony for small files:** a three-line helper still needs a Package, a position and a classifier.
4. **The classifier is a claim, not a proof:** the name asserts a discipline the file may not keep. Only the per-classifier records constrain the contents.

**Risks:**

1. **The suffix set is closed on no measured evidence.** Four classifiers may not partition real code, and the pressure appears as authors reaching for the nearest fit. **Mitigation:** the stop protocol in Decision 5 routes every misfit to a `needs-triage` issue, and that count is the amendment trigger.
2. **`.pure` as a loophole.** The colocated test lane keys on a suffix an author controls, so renaming a file widens what its test may import. **Mitigation:** the lane is one file wide and requires a shared directory and base name, so the pairing is visible in a directory listing.
3. **Scope outruns the enforcer.** This record governs every file under `src/`, while the configured checks reach only `src/packages/**` and only TypeScript. **Mitigation:** stated in Compliance below rather than hidden; the gap closes when the remaining source moves into a Package.

## Compliance and Enforcement

**Enforcer per Discipline.** The tree shape and the import boundaries (Decisions 1 and 3) are held by the six named rules in `.dependency-cruiser.cjs` — `entrypoint-boundary-from-app`, `entrypoint-boundary-across-packages`, `tests-through-entrypoints`, `colocated-test-lane`, `tests-folder-is-private` and `no-circular` — all at `error`, run by `npm run lint:boundaries` inside `npm run verify`. The classifier vocabulary (Decision 2) is held in `eslint.config.mjs` by `check-file/filename-naming-convention` over two keys, plus a core `no-restricted-syntax` `Program` selector that fails any file matching neither key; both read the same glob constants, which is what keeps them from disagreeing. Kebab-case (Decision 4, item 1) is held by the same `check-file` key.

**Known reach gap.** The two halves reach differently. The classifier checks — the naming convention and the exhaustiveness net — select `src/packages/**/*.ts`, narrower than this record's `src/**/*` in two directions: source outside `src/packages/` and files that are not TypeScript. The boundary rules reach further, because `depcruise src` crawls the whole source tree and two of the six are not scoped to the packages root at all: the cycle ban is unscoped, and the entry-point boundary matches an importer that sits outside every Package by construction. Widening the classifier checks is sequenced with moving the remaining source into a Package, so that the check goes red on real files before it goes green.

**Not mechanically enforced — review duty:** that a name states its subject rather than a mechanism (Decision 4, item 2); that a barrel has not been reintroduced under a legal file name (Decision 1, item 4); that an author stopped rather than guessed when no classifier fit (Decision 5).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) — the boundary rules and their `$1` back-reference form.
- [eslint-plugin-check-file](https://github.com/dukeluo/eslint-plugin-check-file) — `filename-naming-convention`, matched against the basename with the final extension stripped.
- [Go — package names](https://go.dev/blog/package-names) — the "Bad package names" section: `util`, `common` and `misc` "provide clients with no sense of what the package contains".
- [Google Go Style — util packages](https://google.github.io/styleguide/go/best-practices#util-packages) — the same ban, restated as a maintained style rule.
- [Cargo — package layout](https://doc.rust-lang.org/cargo/guide/project-layout.html) — `src/bin/`, the worked case of a directory name silently changing how its contents build.
