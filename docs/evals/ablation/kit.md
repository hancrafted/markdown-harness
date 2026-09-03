# The acceptance kit

The fixture corpus and the black-box suite that every ablation arm receives and none may edit.
`implementation-spec.md` §6 is the arm-facing description of it; this file is the operator-facing
one — what it contains, how it is copied, and what the scaffold has to provide for it to run.

## Copy contract

Everything under `kit/` lands at the **scaffold root**, verbatim, with exactly one transformation:

```
kit/fixtures/**                      → fixtures/**
kit/tests/acceptance/run-cli.ts      → tests/acceptance/run-cli.ts
kit/tests/acceptance/*.acceptance.ts → tests/acceptance/*.test.ts     ← renamed
```

Nothing else in `docs/evals/ablation/` is copied. This file is not.

### Why the suite is not named `*.test.ts` here

`ARCH-003-testing` scopes itself to `**/*.test.ts` across the whole repo, and three of its four
Disciplines are conventions the ablation exists to watch an agent adopt or decline: the
`success cases`/`failure cases`/`edge cases` split, the `// ARRANGE`/`// ACT`/`// ASSERT` body, and
the two homes a test may occupy. A suite carrying those markers would be read by all nine arms and
edited by none, so the governed arm's record would be scored against an artifact the fixture handed
it — the same failure `#21` already avoids by not shipping `src/packages/AGENTS.md`.

The file genuinely is not a test in this repo: it never executes here. The rename is the same move
the stamp script already makes for `implementation-spec.md` → `SPEC.md`.

`eslint.config.mjs` still holds the suite to the **behavioural** half — no mocks, no snapshots, no
`.skip`, no clock or randomness, every case carrying an `expect`. Those are not conventions under
test; a mocked acceptance suite is broken wherever it runs.

## What the scaffold must provide

Each of these was probed, not reasoned. The first is load-bearing for all nine runs.

1. **`tsconfig.json` with `allowImportingTsExtensions: true`.** The suite spawns `node` on whatever
   `bin.mh` names. Node runs a `.ts` entry directly, but only resolves relative imports written
   with their `.ts` extension — extensionless dies `ERR_MODULE_NOT_FOUND`. Without the flag `tsc`
   refuses that same extension with `error TS5097`, so an arm is boxed between the two and
   `npm run verify` can never go green. `feature/prototype` sets it, alongside
   `erasableSyntaxOnly: true` — which is what stops an arm writing the `enum` that `tsc` accepts
   and Node's type stripper rejects.
2. **`"type": "module"` in `package.json`**, and **no `bin` field** — declaring `bin.mh` is the
   arm's first act.
3. **Dependency ranges written as exact pins.** A caret is an `ARCH-001-dependency-admission-bar`
   violation in a file the agent never authored — a forced violation in six of nine runs. A tilde
   hands over that record's own lesson. An exact pin is compliant under §5.1 and teaches nothing.
4. **A YAML parser is not supplied.** `feature/prototype` depends on `yaml`; the scaffold ships no
   such dependency, so each arm either installs one or writes its own. That is behaviour worth
   measuring, but it makes a run network-dependent.

Prettier needs no ignore entry: the whole kit is already `--check` clean.

## The frozen verdict

`fixtures/valid-test-config.yaml` over `fixtures/docs/**` — 25 files, reproduced live against
`feature/prototype` rather than transcribed:

| quantity                  | value                                  |
| ------------------------- | -------------------------------------- |
| governed files            | 24                                     |
| invalid files             | 15                                     |
| total violations          | 22                                     |
| conforming governed files | 9                                      |
| invisible files           | 1 — `docs/research/vendor/upstream.md` |
| violation codes reached   | 18 of 18                               |

`fixtures/governs-everything-config.yaml` selects every markdown file at any depth, so the walker
becomes observable: against the corpus the suite plants, exactly one governed file survives.
`fixtures/empty-rule-list-config.yaml` is rejected whole — one fault, exit 2.

## Edits against `feature/prototype`

The corpus and configs are lifted; four edits were made, and the verdict was re-verified unchanged
after each.

1. Both config headers named `../src/packages/contract/config.ts` as a shape reference, and the
   walker config named `src/cli.test.ts` as the planter. Interior layout and testing shape are
   hypotheses under test — an arm reading either was handed one.
2. `empty-rule-list-config.yaml` stated the pre-freeze contract: `{ report: 'config-rejected' }`
   with code `empty-rule-list`. It now states the frozen one.
3. `docs/workflows/terse.md` carried `title: Go` where the spec's §5 transcript pins `"value": "ci"`
   for that exact command line. Same length, same `VALUE_TOO_SHORT`; the transcript is now
   reproducible.
4. Nothing else. Every `intent` string and every fixture's frontmatter is untouched, because both
   are quoted verbatim into responses the suite asserts.

## Re-validating

The suite is checked statically here — `tsc`, `eslint`, `prettier` all reach it — and executed only
inside a scaffold. To exercise it, build a throwaway root, rename the suite, and point `bin.mh`
somewhere:

```sh
S=.worktrees/scaffold-probe
rm -rf $S && mkdir -p $S && cp -R docs/evals/ablation/kit/. $S/
for f in $S/tests/acceptance/*.acceptance.ts; do mv "$f" "${f%.acceptance.ts}.test.ts"; done
printf '{"name":"probe","private":true,"type":"module"}\n' > $S/package.json
npx vitest run --root $S tests/acceptance          # 5 files fail to collect, no tests run
```

Four states worth knowing, all measured:

| `bin.mh`                           | result                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| absent                             | 5 files fail collection, `Tests no tests`, message names the fix |
| names a missing file               | same, quoting the path it could not find                         |
| a stub printing `{}`               | 24 failed, 0 passed — no false green                             |
| `feature/prototype`'s `src/cli.ts` | 11 failed, 13 passed — every failure a named delta               |

The eleven are the deltas `#20` lists: four on `--audit` not existing, three on the config-fault
catalog, two on flag-conflict rejection, one on the default command, one on
`invalidFiles`. The type-level delta produces no failure, correctly — the JSON is identical either
way.
