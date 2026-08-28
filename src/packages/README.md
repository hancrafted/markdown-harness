# Packages

Every Package here is a **deep module**: a lot of behaviour behind a small Interface. Copy this shape.

```
src/packages/
  <name>/
    index.ts              ← an entry point (public). Import this from outside.
    client.ts             ← another entry point. A Package may expose SEVERAL.
    lib/                  ← implementation: private, free to import each other.
      impl.pure.ts
      impl.test.ts        ← the UNIT home: tests impl.pure.ts, its same-name sibling.
      span.types.ts
    tests/                ← the INTEGRATION home, plus fixtures (a subfolder, so private).
      example.test.ts
```

Packages are **flat**: one tier of immediate children here, and a Package may not contain another. A Package's internals may nest as deep as you like.

## The six boundary rules

Held by `dependency-cruiser`, all at `error`, one per named rule in `.dependency-cruiser.cjs`. Run them with `npm run lint:boundaries`; `npm run verify` runs them too.

1. **Entry-point boundary.** Code outside a Package may import that Package's entry points — its root files — and never anything in its subfolders.
2. **Intra-package freedom.** A Package's own files import each other freely; another Package they reach only through its entry points.
3. **Tests through the entry points.** Files under `<pkg>/tests/` reach any Package through its entry points and their own `tests/` fixtures, never any Package's internals — not even their own.
4. **The colocated test lane.** A `*.test.ts` below a Package root may import exactly one internal: its same-directory sibling of the same base name carrying `.pure.ts`. No other internal, in any Package, including its own.
5. **`tests/` is private to tests.** Nothing outside a Package's `tests/` may import anything inside it — its own implementation included. Rule 2's freedom stops at the fixtures.
6. **No cycles.**

**Entry points, not a barrel.** The public surface is _every_ root file, so expose several small entry points rather than funnelling everything through one giant `index.ts`. A barrel that re-exports a whole subtree is the thing this shape exists to avoid. Re-exporting a type from an entry point (`export type { Span } from './lib/span.types'`) is fine and is the intended idiom.

## The suffix vocabulary

**Position decides the public surface; the suffix decides the discipline inside.** Held by `eslint-plugin-check-file` and core ESLint rules, configured in `eslint.config.mjs`.

| Where         | Name                                   | Carries                                                |
| ------------- | -------------------------------------- | ------------------------------------------------------ |
| Package root  | `kebab-case.ts`, **no suffix, no dot** | an entry point: the Seam, a small surface              |
| Any subfolder | `kebab-case.pure.ts`                   | code whose result is a function of its arguments alone |
| Any subfolder | `kebab-case.impure.ts`                 | everything else: I/O, clocks, ambient reads            |
| Any subfolder | `kebab-case.types.ts`                  | exported **type declarations** only                    |
| Any subfolder | `kebab-case.test.ts`                   | tests                                                  |

**Exactly one classifier per file. No stacking, no escape.** `foo.pure.impure.ts` fails, `foo.ts` in a subfolder fails, and `foo.pure.ts` at a Package root fails. A `.ts` file under `src/packages/` that is neither an entry point nor a subfolder file fails outright — a file no glob selects loads no ADR, and silent non-governance is the failure this closes.

`*.pure.ts` admits a member **iff its result is a function of its arguments alone**. All of `Math` except `random`; `Date` only with an instant supplied _and_ only through the `getUTC*` accessors. `src/packages/example/lib/impl.pure.ts` is the worked example.

## The two test homes

A test declares its grain by where it sits, and the boundary rules hold it to that grain.

| Home                            | Grain             | Imports                                                   |
| ------------------------------- | ----------------- | --------------------------------------------------------- |
| `<pkg>/tests/*.test.ts`         | the whole Package | any Package's entry points, and its own `tests/` fixtures |
| `<pkg>/<subfolder>/foo.test.ts` | one unit          | `./foo.pure.ts`, and any Package's entry points           |

**Why a unit gets its own home.** A unit may be as small as a single function, and extracting complex private logic into its own file is the standard way to make it testable — which is what a `*.pure.ts` file already is. Treating it as an unreachable internal would mean the only way to test it is through a Package's whole Interface, where a wrong result and a wrong composition look the same.

**Why the lane is one file wide.** Anything wider is a loophole rather than a lane: rename a file `.pure.ts` and every restriction lifts. The sibling has to share the test's directory and base name, so the pairing is visible in a directory listing.

**`*.impure.ts` gets no colocated home.** Isolating impure code means substituting its I/O, and a test here asserts against real behaviour rather than against a stub of your own writing. So impure code is exercised through its Package's entry point, against real files. If that feels hard to reach, the pure part wants extracting — not the test wants relaxing.

**Which one to write.** Reach for `tests/` by default: it asserts what a caller can actually observe. Add a colocated suite when a unit has behaviour the entry point can only reach indirectly, so a wrong answer and a wrong composition would be indistinguishable from outside. `src/packages/example/` carries one of each.

## Suite shape

Every suite under `src/` splits into `success cases`, `failure cases` and `edge cases`, at most two `describe` levels deep, and every test body reads `// ARRANGE`, `// ACT`, `// ASSERT`. Held by `eslint.config.mjs` — the suite-structure selectors and the local `test-body-aaa` rule. `CONTEXT.md` defines the three block names; `failure cases` in particular means **asserts what must not happen**, which is wider than "throws".

## When the vocabulary has no slot

**When the vocabulary has no slot for your file, stop.** Do not guess, do not add a second suffix, do not park it at a Package root to dodge the choice. Open a `needs-triage` issue: the count of those is the evidence that the vocabulary is wrong.
