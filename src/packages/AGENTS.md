# Packages

Every Package here is a **deep module**: a lot of behaviour behind a small Interface.

This file is a tour, not the law. The governing records carry the Disciplines and load
themselves into your context when you open a file they govern. If this file and a record
disagree, the record wins.

## The shape

Read ARCH-004 for the detailed shape

## Which record governs what

| You are about to                   | Read                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| add a file, name one, or move one  | `ARCH-004` — the Package tree, one classifier per file, the import boundaries, subject naming     |
| write or export a type declaration | `ARCH-005` — where an exported type declaration lives, and what a `*.types.ts` file may hold      |
| write a `*.pure.ts` file           | `ARCH-006` — what a member must satisfy to be admissible, and the two ambient reads               |
| write any test                     | `ARCH-003` — the behavioural bans, the three-block suite split, marked test bodies, the two homes |
| touch any file under `src/`        | `GEN-003` — repo-wide hygiene                                                                     |

Each record lives in `.archgate/adrs/` and is symlinked into `.claude/rules/`, so opening a
file it governs loads it — but measurably only when you open it with the Read tool. Reading
through `cat` or `grep` loads nothing. When you have not opened the file directly, run
`npx archgate review-context`, or `npx archgate adr show <id>` to print one on demand.
The measurement is in `docs/workshop/probe/adr-routing/measurement.md`.

## The worked example

There is no copy-me template Package. The canonical shape is the `Example` block in `ARCH-004`,
which loads itself when you open any file under `src/`.

Every classifier now has an on-disk instance, so read one rather than only the record: 35 `.pure.ts`
files and 5 `.impure.ts` files sit under `src/packages/`, measured 2026-09-08. `config-contract/` is
still the one Package that holds nothing but `.types` under `lib/` and `.test` under `tests/`, which
is why its boundary edges are invisible to `dependency-cruiser` — trap 5 in the root `AGENTS.md`.

For a `.pure` file whose determinism is the whole point, read `usage.pure.ts` or `parse-argv.pure.ts`
under `cli/lib/argv/`. For the `.impure` boundary, read `cli/lib/run/invocation-run.impure.ts`, which
states its one ambient read in its own docblock. `ARCH-006` and `ARCH-007` remain the records that
govern them; the files are the example, never the authority.

## Running the checks

```bash
npm run lint:boundaries   # the import graph, via dependency-cruiser
npm run verify            # everything, including the above
```

`eslint.config.mjs` is the register for the within-file checks; `.dependency-cruiser.cjs` is
the register for the import graph. Each governing record names its own enforcer.

## When nothing fits

If no classifier suits your file, open a `needs-triage` issue naming the file and the discipline it needs rather than guessing, inventing a new suffix, or parking the file at a Package root.
