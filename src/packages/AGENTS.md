# Packages

Every Package here is a **deep module**: a lot of behaviour behind a small Interface.

This file is a tour, not the law. The governing records carry the Disciplines and load
themselves into your context when you open a file they govern. If this file and a record
disagree, the record wins.

## The shape

```
src/packages/
  AGENTS.md             ← this file. CLAUDE.md is a symlink to it.
  <name>/
    index.ts            ← an entry point (public). Import this from outside.
    client.ts           ← another entry point. A Package may expose SEVERAL.
    lib/                ← implementation: private, free to import each other.
      impl.pure.ts
      impl.test.ts      ← the UNIT home: tests impl.pure.ts, its same-name sibling.
      span.types.ts
    tests/              ← the INTEGRATION home, plus fixtures (a subfolder, so private).
      example.test.ts
```

## Which record governs what

| You are about to                   | Read                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| add a file, name one, or move one  | `ARCH-004` — the Package tree, one classifier per file, the import boundaries, subject naming     |
| write or export a type declaration | `ARCH-005` — where an exported type declaration lives, and what a `*.types.ts` file may hold      |
| write a `*.pure.ts` file           | `ARCH-006` — what a member must satisfy to be admissible, and the two ambient reads               |
| write any test                     | `ARCH-003` — the behavioural bans, the three-block suite split, marked test bodies, the two homes |
| touch any file under `src/`        | `GEN-003` — repo-wide hygiene                                                                     |

Each record lives in `.archgate/adrs/` and is symlinked into `.claude/rules/`, so opening a
file it governs loads it. `npx archgate adr show <id>` prints one on demand.

## The worked example

`example/` is committed as a copy-me template and demonstrates one of each shape:

- `index.ts` — an entry point that delegates to an internal, so the Package is visibly deep
  rather than a pass-through.
- `lib/impl.pure.ts` — the admissible-member boundary in practice.
- `lib/span.types.ts` — an exported type declaration in its own home, re-exported from the
  entry point.
- `lib/impl.test.ts` — the colocated unit home, paired to its same-name `.pure.ts` sibling.
- `tests/example.test.ts` — the integration home, reaching the Package through its entry point.

## Running the checks

```bash
npm run lint:boundaries   # the import graph, via dependency-cruiser
npm run verify            # everything, including the above
```

`eslint.config.mjs` is the register for the within-file checks; `.dependency-cruiser.cjs` is
the register for the import graph. Each governing record names its own enforcer.

## When nothing fits

`ARCH-004` carries a stop protocol for the case where no classifier suits your file. It is
already in your context — its `paths:` selects every file under `src/` — so read it there
rather than acting on a summary of it here.
