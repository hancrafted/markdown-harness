---
type: research
---

# R7: phase 0 probes and red proofs

Phase 0 of issue #240 (design A, tool-centred steering eval on promptfoo under `evals/`). Part 1 answers the four probe questions of step 0a. Part 2 records the red proof for every widening of step 0c. Part 3 lists what the proofs found that the spec did not expect.

Measured on 2026-10-07 on macOS, Node v26.5.0, promptfoo 0.124.0 through `npx -y promptfoo@0.124.0`, the version R2 pinned. Probes ran in a scratch directory under `/private/tmp/claude-501/`, outside the repository. Where a claim comes from reading the installed package it says "source". Proof output below is trimmed to the relevant lines.

## 1. The four probes

### 1.1 Does the tool load a TypeScript provider directly?

Yes. No precompile step. `promptfoo` 0.124.0 depends on `tsx ^4.23.11`, and `providers: ['file://provider.ts']` loaded a class provider written with type annotations, an `interface` and a `Promise<{ output: string }>` return type:

```
npx -y promptfoo@0.124.0 eval -c promptfooconfig.yaml --no-cache -o out.json
[PASS] HELLO WORLD! noext-ok 1 string       # exit 0, 1 passed
```

### 1.2 Do relative imports resolve inside a provider?

Yes, with and without the extension. The provider imported `./lib/helper.ts` (explicit `.ts`, the form `tsconfig.json`'s `allowImportingTsExtensions` makes this repository use) and `./lib/noext` (no extension). Both resolved, and a `node:os` builtin import worked. Output of the run above shows both values were combined (`HELLO WORLD!` from the helper, `noext-ok` from the extensionless module).

Not probed: imports that leave the config directory upward (`../`), which the layout under `evals/packages/` will need; and imports of a `.ts` file reached through a symlink.

### 1.3 Which variable sets the configuration directory?

`PROMPTFOO_CONFIG_DIR`. With it set to `$S/home`, a run wrote `promptfoo.db` (SQLite, plus `-shm` and `-wal`), `promptfoo.yaml`, `evalLastWritten`, `logs/` and, once an HTTP provider ran, `cache/cache.json` into it, and nothing went to `~/.promptfoo/`. Source: `PROMPTFOO_CACHE_PATH` overrides the cache location on its own, defaulting to `<config dir>/cache`. A run with `PROMPTFOO_CACHE_PATH=$S/cachedir` created `cachedir/cache.json`.

So the whole state tree can be relocated under a gitignored `evals/runs/` directory by one variable.

### 1.4 Which switches turn off telemetry, update checks and caching?

| Concern                  | Switch                                                | Evidence                                            |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| Telemetry                | `PROMPTFOO_DISABLE_TELEMETRY=1`                       | source: `telemetry-*.js` returns no client when set |
| Update check             | `PROMPTFOO_DISABLE_UPDATE=1`                          | source: `main.js` returns before the check when set |
| Sharing                  | `PROMPTFOO_DISABLE_SHARING=1`                         | source: 27 references                               |
| Cache                    | `--no-cache` flag, or `PROMPTFOO_CACHE_ENABLED=false` | probed, below                                       |
| Exit on failed assertion | `PROMPTFOO_FAILED_TEST_EXIT_CODE=0`                   | probed, below                                       |

**Cache, probed against a local HTTP server that counts its hits** (`http://127.0.0.1:18765`):

```
default1 (CONFIG_DIR only): hit-1 cached= False
default2:                   hit-1 cached= True      # replayed, server never hit
--no-cache:                 hit-2 cached= False
CACHE_ENABLED=false:        hit-3 cached= False
CACHE_PATH=cachedir:        hit-4 cached= False     # fresh dir, so a miss
```

The default replays. Both switches defeat it. This confirms R2's silent-wrong-answer trap for built-in providers.

**A custom `file://` provider is not cached by the tool at all.** A provider returning `process.hrtime.bigint()` gave a different value on every run with the cache on (`c1` and `c2` below differ). A cache only exists where the provider code or a built-in provider calls the tool's cache helper, so for a TypeScript provider the replay hazard is the provider's own, and `--no-cache` still belongs in the wrapper as belt and braces.

```
a  311081732631291        c1 311084487482791
b  311083124085666        c2 311086009556208
```

**Exit code.** A failed assertion exits 100 by default, a pass exits 0, and `PROMPTFOO_FAILED_TEST_EXIT_CODE=0` makes the failed run exit 0. Confirms R2 and decision 20: the wrapper owns the exit code.

**Telemetry on the wire: inconclusive.** I pointed `HTTP_PROXY`, `HTTPS_PROXY` and `NODE_USE_ENV_PROXY=1` at a local listener that logs `CONNECT` and plain requests, and ran with no switches, each switch alone, both, and both plus sharing. The listener saw no connection in any run, including the run with no switches. Either the telemetry client does not use the proxy variables, or it batches and the process exited first. So the switches are confirmed by source only, and spec-1's line that whether telemetry is truly suppressed belongs to the self-test tier stands. A network-level check needs a firewall or an offline run, not a proxy.

## 2. Red proofs for the widened scopes

Each proof plants a violation, runs the guard, and removes the plant. Every run also has a control after removal. `knip` and `eslint` ran in the worktree, which verification trap 2 says is unmeasured for a whole-repository run; these proofs name a planted file and read the guard's report on that file, which the location does not affect, and the control runs came back clean.

### 2.1 Pure eval file importing a builtin fails dependency-cruiser: RED

Plant: `evals/packages/arms/lib/carriers/plant-builtin.pure.ts` containing `import { sep } from 'node:path'`.

```
npm run lint:boundaries      # depcruise src evals
  error pure-imports-no-builtin: evals/packages/arms/lib/carriers/plant-builtin.pure.ts → path
  error only-the-gate-imports-a-builtin: evals/packages/arms/lib/carriers/plant-builtin.pure.ts → path
x 2 dependency violations (2 errors, 0 warnings). 276 modules, 802 dependencies cruised.
```

Control after removal: `no dependency violations found (275 modules, 801 dependencies cruised)`. The module count moving 275 to 276 shows the plant was cruised.

Three companion plants, same command:

- a `.impure.ts` file outside the gate importing `node:path`: `only-the-gate-imports-a-builtin` fires on it. RED.
- `src/packages/foundation/lib/platform/plant-spawn.impure.ts` importing `node:child_process`: `error foundation-never-spawns: ... → child_process`. RED.
- `evals/packages/platform/lib/platform/spawn.impure.ts` importing `node:child_process`: `no dependency violations found (276 modules, 802 dependencies cruised)`. GREEN, as intended: the `evals/` gate may spawn.

### 2.2 File under `evals/` with no classifier fails eslint: RED

Plants: `evals/packages/arms/lib/carriers/stray.ts` (below a Package root, no suffix), `evals/stray.ts` (outside any Package), `evals/packages/arms/stray-root.ts` (a Package root file, legal by position).

```
evals/packages/arms/lib/carriers/stray.ts
  1:1  error  stop: "stray.ts" does not match "+([a-z0-9-]).@(pure|impure|types|test)". ...  check-file/filename-naming-convention
evals/stray.ts
  1:1  error  stop: this file sits outside src/packages/<package>/ and evals/packages/<package>/ and no ADR governs it. ...  no-restricted-syntax
```

The Package root file raised only `no-inferrable-types` from the plant's own content, which is correct: a kebab-case root file without a suffix is valid. Control after removal: `eslint evals` exit 0.

### 2.3 File in `src/` importing `evals/` fails dependency-cruiser: RED

Plant: `src/packages/foundation/plant-evals.ts` importing `../../../evals/packages/arms/lib/carriers/intent-carriers.pure.ts` (the relative path that resolves).

```
  error src-never-imports-evals: src/packages/foundation/plant-evals.ts → evals/packages/arms/...
x 1 dependency violations (1 errors, 0 warnings). 276 modules, 802 dependencies cruised.
```

The reverse direction, `evals/` importing `src/packages/cli/assessment.ts`: `error evals-never-imports-src: evals/packages/arms/lib/carriers/plant-src.impure.ts → src/packages/cli/assessment.ts`. RED. My first attempt used a wrong relative path, resolved to nothing, and the cruise reported clean; the retry with a resolving path is the proof. A guard's plant must resolve before a green means anything.

### 2.4 A planted `evals/` file is absent from the build file list and the tarball: PROVED

Plant: `evals/packages/arms/lib/carriers/plant-listed.pure.ts`.

```
npx tsc --noEmit --listFilesOnly | grep -c evals/                      -> 4   (type-check reaches it; plant listed)
npx tsc -p tsconfig.build.json --listFilesOnly | grep -c evals/        -> 0
npm run build; find dist -path '*evals*' | wc -l                       -> 0
npm pack --dry-run | grep -E "evals|plant"                             -> (no lines)   total files: 149
```

The type-check list contains it and the build list does not, so this is a two-sided proof.

### 2.5 A planted unreferenced file appears in knip's report: RED

Plants: `evals/packages/arms/orphan-root.ts` (a Package root file) and `evals/packages/arms/lib/carriers/orphan-deep.pure.ts`.

```
Unused files (2)
evals/packages/arms/lib/carriers/orphan-deep.pure.ts
evals/packages/arms/orphan-root.ts
```

Control after removal: exit 0.

My first knip configuration listed `evals/packages/*/*.ts` as entries. Under it only the deep plant was reported, and the root plant was silently an entry, so a Package root nobody imports could never be unused. That is a vacuous green found by the proof. The configuration now lists `evals/packages/wrapper/*.ts` and `evals/packages/adapters/*.ts`, the two Packages spec-1 decision 3 says are invoked by the tool rather than imported. Neither exists yet, so knip prints two "Refine entry pattern (no matches)" hints and exits 0.

### 2.6 A planted `evals/` test using a mock fails archgate check: NOT PROVABLE AS WRITTEN

Plant: `evals/packages/arms/lib/carriers/plant-mock.test.ts` using `vi.spyOn`, made visible to the changed-file scope with `git add -N`.

```
npx archgate check
{"pass":true,"total":14,"passed":14,"failed":0,"warnings":0,"errors":0, ...}
npx archgate check evals/packages/arms/lib/carriers/plant-mock.test.ts
{"pass":true,"total":1,"passed":1,"failed":0, ...}
```

The total is non-zero (trap 1 satisfied), and nothing failed. ARCH-003 is `rules: false`: it has no companion rules file, so `archgate check` has nothing to run against a mock. Its own Compliance Enforcement names ESLint as the enforcer, and ESLint does fail the plant:

```
npx eslint evals/packages/arms/lib/carriers/plant-mock.test.ts
  2:39  error  stop: a mock asserts against your own stub — exercise the real thing through its entry point  no-restricted-syntax
  2:15  error  stop: a top-level suite must split into success cases, failure cases, edge cases              no-restricted-syntax
  2:23  error  stop: this test body needs `// ARRANGE` exactly once, found 0 ...                             local/test-body-aaa
```

So the mock ban under `evals/` is proved red by eslint, not by archgate. The spec's wording ("fails the ARCH-003 check, with a non-zero archgate total") assumes a mechanical archgate check that does not exist. See section 3.

GEN-003 does have a rules file, and it is proved red by its own test: a `.archgate/adrs/GEN-003-codebase-hygiene.rules.test.ts` case plants an eslint directive under `evals/packages/arms/lib/carriers/` and expects one violation naming that file.

## 3. Findings the spec did not expect

1. **Proof 2.6 as written cannot pass.** ARCH-003 has no archgate rule. Either the spec reads "the ARCH-003 check" as eslint, or a rules file is owed. Han decides; I did not add one.
2. **A Package root file is an entry only where a tool invokes it.** Listing every `evals/packages/*/*.ts` as a knip entry hides unused Package roots (2.5).
3. **A planted import that resolves to nothing proves nothing** (2.3).
4. **A custom TypeScript provider is never cached by the tool** (1.4). R2's replay trap applies to built-in providers; for ours the hazard is code in the provider.
5. **Telemetry suppression is unverified on the wire** (1.4).
6. **The depcruise rule names changed.** `only-the-gate-imports-a-builtin` and `gate-builtins-sit-in-platform` now match two gates, and `foundation-never-spawns`, `src-never-imports-evals` and `evals-never-imports-src` are new. Any note citing "the six boundary rules" is now stale.
