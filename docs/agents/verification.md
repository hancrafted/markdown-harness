# Verification: the gate and its fifteen traps

`npm run verify` is the gate. This page holds the traps inside it — the places where a check
reports success without having measured anything.

Every trap below is one shape of a **vacuous green**: a check reporting success over nothing.
Before trusting a check that passed, break what it guards and watch it go red. Give a silent check
a two-sided canary it re-proves on every run — one planted violation it must catch, one clean case
it must pass — because a one-sided canary passes while the check does nothing.

A compile-time guard makes the same claim and earns the same proof. Delete a key from the record
and expect `TS2741`; add a bogus one and expect `TS2353`. A `keyof` that resolves to `string`
through an index signature or an `any` accepts every key while reading correctly at a glance.

**The numbers are load-bearing.** `docs/agents/release.md`, `.github/workflows/ci.yml`,
`src/packages/AGENTS.md` and the `release` skill all cite these traps by number. Add at the end;
renumbering silently breaks those citations.

## 1. `archgate check` is changed-files-scoped

It evaluates only ADRs whose `files:` glob matches a file changed against `baseBranch`
(`.archgate/config.json`), and explicit path arguments are intersected with that same set. So
`total: 0` means _nothing in scope changed_ — never _governance passed_. To exercise the rules
deliberately, give it a base that reaches an ADR edit: `npx archgate check --base HEAD~3`.

## 2. `verify` is not trustworthy inside an agent worktree

A Host harness that isolates an agent puts the worktree under `.claude/worktrees/` — inside this
repo — and installs it incompletely: `node_modules/.bin` comes out empty. `knip` then reports every
devDependency unused and every binary unlisted, and the same nesting makes typescript-eslint fail
all files with _"multiple candidate TSConfigRootDirs"_ from the repo root. Both are artifacts of the
location, not of the diff.

So a worktree agent must not conclude "this failure is pre-existing" by stashing and re-running _in
the worktree_ — the baseline is contaminated the same way. Re-run `verify` from the real root after
merging, and treat a worktree's green or red on `knip` and `eslint` as unmeasured. But install it
first: measured 2026-09-04 in a `.worktrees/` worktree — the second worktree location this repo
uses, so the diagnosis is not specific to the `.claude/` path — `node_modules/` was present and
empty, `knip` reported all eleven devDependency binaries unlisted, and `eslint` passed, so the two
halves of this trap do not fail together. `npm ci` inside the worktree took `node_modules/.bin` from
absent to 32 entries and `npm run verify` to exit 0 including `knip`. An installed worktree is
measurable; "unmeasured" is the fallback when installing is impossible, not the first move.

**This trap can block a `git push`, not just confuse a diagnosis.** `.husky/pre-push` runs
`npm run verify`, whose last step is `knip` — so an uninstalled worktree cannot push at all, and the
refusal names five unused devDependencies rather than the install. Measured 2026-09-11: `knip` exited
**1** in a `.worktrees/` worktree and **0** against a complete `node_modules`, on the identical tree.
Symlinking `node_modules/.bin` alone is not enough; `knip` resolves the packages themselves, so the
whole directory has to be there.

## 3. The ADR size budget counts characters, not bytes

`wc -c` overstates by two per em dash, and this repo's ADR prose is full of them — enough to
misreport a record by a hundred characters and to disagree with the figure `archgate check` prints.
Measure with something character-aware, and when planning a cut, trust `archgate check`'s number
over the shell's.

## 4. An enforcer's rule count comes from evaluating its array, never from grepping it

A `## Compliance and Enforcement` section that states how many checks hold a Discipline makes a
claim a reader will trust and nothing will verify. The configs here build those arrays from a list —
`['TSInterfaceDeclaration', ...].map(...).concat([...])` — so the `selector:` key appears once inside
the map callback and generates one entry per node type. Grepping counts that callback as a single
selector and undercounts the group: this is how six selectors shipped as four. Extract the
expression, run it, and print `.length` before writing the number down.

## 5. A boundary check reports green while cruising nothing

`dependency-cruiser` sees only post-compilation edges unless `tsPreCompilationDeps: true` is set, so
every `import type` and `export type … from` is erased before the rules run. A Package whose edges
are all type-only — `config-contract` holds nothing but type declarations — therefore satisfies all
six of `ARCH-004`'s boundary rules by presenting no visible edges at all, and
`npm run lint:boundaries` still prints `✔ no dependency violations found`. The counts in that same
line are the only signal that distinguishes the two cases: `7 modules, 3 dependencies` with the flag
off and `7 modules, 7 dependencies` with it on describe the identical tree. Read the dependency
count, not the checkmark — and expect it to fall to near zero exactly when the last file holding a
runtime import leaves `src/`.

**Archgate erases types for the same reason**: it transpiles TypeScript before parsing, so a rule
calling `ctx.ast()` on a file holding only type declarations gets an empty ESTree body, and
type-only declarations are unreachable from every archgate rule
([#16](https://github.com/hancrafted/markdown-harness/issues/16)).

## 6. `archgate check`'s `briefingWarnings` is empty now, so a warning there is signal

It used to be non-empty on every invocation — four records carried a `Decision` section over the
2,000-character briefing cap — and the standing instruction was to ignore it. That is no longer
true: the compression commits took all four under the cap and `briefingWarnings` measures `[]`
against every base. [#28](https://github.com/hancrafted/markdown-harness/issues/28) and
[#27](https://github.com/hancrafted/markdown-harness/issues/27) are both closed now, so read the
tree rather than either ticket — the two have already disagreed with the measurement in both
directions. Two of the four sit close to the line, `ARCH-003` at 1,999 characters and `ARCH-004` at
1,928, so **one added sentence in either `Decision` reopens the warning** — which is why this trap is
now the opposite of what it was. Do not carry forward the habit of dismissing the array; a warning
in it today names something your change did.

**The cap is per capped section, and `Decision` is not the only one.** Measured 2026-09-09, adding
one Discipline to `ARCH-002`: five new items under `## Do's and Don'ts` produced
`{"section": "Do's and Don'ts", "length": 2372, "cap": 2000}`. So a record can sit comfortably under
the cap in `Decision` and breach it in the section below, and adding a Discipline pays for itself
twice — once in each. Both halves of `ARCH-002` now sit within about thirty characters of the line.
**Only the figure `archgate check` prints is authoritative**: a shell character count over a
`## Decision`-to-`## Do's and Don'ts` slice includes the heading and over-reports, which is trap 3's
problem in a second costume.

## 7. A repo-wide formatter can brick pinned trees, and the refusal will not say so

The stamped assets are pinned by content hash against `assets/assets.sha256` in
`prepare-ablation-run`, and `preflight.sh` refuses to mint a run when a pin and its tree disagree.
`prettier --write .` over that tree therefore produces a refusal that reads as tampering, over a
reformat nobody chose, and the message names the drift rather than the cause. It is in
`.prettierignore` with that reason attached, and the same care is owed to anything pinned later:
**a content pin and a repo-wide `--write` are incompatible unless the pinned path is ignored.**

Malformed fixtures are ignored for a neighbouring reason — they are deliberately malformed, and
formatting them would repair the defects they exist to present.
`fixtures/conformance/docs/plain/broken/**` joins them on the same grounds. Scope an entry like that
to the directory, never to the files that fail today: of the four malformed blocks there, only the
unclosed fence moves under `prettier --write` — prettier leaves a block it cannot parse alone — so
which shapes survive formatting is an accident of the parser rather than a property anyone chose.

## 8. `vitest` never typechecks, so a per-file green proves only that the code ran

Vitest transforms with esbuild, which strips types without reading them — so
`npx vitest run <one file>`, which is exactly the inner loop §7's "work in vertical slices"
produces, passes happily over code `tsc` rejects. Measured 2026-09-07: five units went green that
way one after another, and `tsc --noEmit` then found 21 errors across those same five files — among
them an `as` cast that had widened a discriminated union's `requirement` key to an index signature,
which no test could have caught because both shapes hold identical data at run time. The full chain
runs `tsc` **before** `vitest`, so the gate does catch this; the trap lives entirely in the inner
loop, where the temptation is to defer the typecheck to the end. Run `tsc --noEmit` beside the
single-file test run, not once after all of them — a green unit test is evidence about behaviour and
says nothing whatever about types.

## 9. A green process-boundary suite can be measuring the previous build

`bin.mh` names a compiled artefact under `dist/`, and `src/packages/cli/tests/cli.test.ts` spawns
exactly what it names — so `npx vitest run src/packages/cli/tests/cli.test.ts` after an edit you
have not built runs the **old** entry. The suite's start-up guard only asks whether `dist/` exists,
never whether it is current, and nothing anywhere checks freshness. Measured 2026-09-07: a changed
refusal string that never reached `dist/` left all 26 tests green while the source on disk said
something else. `npm run verify` runs `npm run build` before `vitest`, so the gate is safe; the trap
lives entirely in the inner loop, beside trap 8 and with the same shape. Run `npm run build` next to
the single-file test run — a green integration suite is evidence about the artefact, and only a
build makes the artefact evidence about your source.

## 10. A hook reported `wired` is not a hook that will run

`init.mjs` reports `{"step":"hook","done":"wired"}` once the `PostToolUse` entry is in
`.claude/settings.json`. That is a claim about a file, and two independent things stand between it
and the hook actually firing — both measured on 2026-09-09 across four throwaway repositories, and
neither visible from anything the script can report.

**The watcher can miss the write.** Claude Code normally picks settings edits up without a restart,
and the official guide names the failure mode in the same breath: if the entry has not appeared
after a few seconds, the watcher may have missed the change and the session must be restarted. In
test-3 `init.mjs` reported `wired`, and every subsequent `PostToolUse:Read` resolved only to an
unrelated plugin hook. The agent then reported the hook as a completed, proven step. `/hooks` is a
read-only viewer and is the only thing that answers whether **this** session will run it.

**A `Read` matcher never sees `Bash cat`.** A matcher of bare letters is an exact tool-name match —
the docs say an `"Edit|Write"` matcher fires "only when Claude uses the `Edit` or `Write` tool, not
when it uses `Bash`, `Read`, or any other tool". In test-4 the agent made **zero** `Read` calls,
routing every file through `Bash` and `grep`, so the hook could not fire once — while that same
session confidently explained how the hook works.

The general shape: **a script exiting 0 is evidence about the script, never about the layer it
wired.** The guard against it is `docs/markdown-harness/activity.csv`, which the hook appends to on
every invocation that finds a config root, silent ones included. A `fresh` row proves the hook ran
and chose to say nothing; no rows at all is the finding. Verify from the log, and never from a
step's own report — `src/packages/cli/tests/assess-hook.test.ts` is where that log is held to it.

## 11. Nothing under `.agents/skills/` is reached by the gate except `prettier`

Measured 2026-09-09 on a change touching only `.agents/skills/setup-local-e2e-repo/`. Two checks
inside `verify` report green over it without looking at it, and they fail in different directions.

**`archgate` has no ADR in scope.** Every `files:` glob in `.archgate/adrs/` points at `src/**`,
`package.json`, `fixtures/conformance/**`, `.archgate/adrs/**`, `.claude/rules/**`, or
`**/*.test.ts`. `archgate review-context --run-checks` on that change returned `"domains": []`
alongside `"total": 0` — not one briefing applied. This is trap 1 with the scope emptied by path
rather than by diff, so re-running with `--base` does not reach it either: no base makes an
unwritten ADR apply.

**`eslint` parses these files and configures no rule for them.** Every rule block in
`eslint.config.mjs` is held behind `files: ['**/*.ts']` or `GOVERNED` (`src/**/*.ts`), and ESLint 9
lints `**/*.mjs` by default — so a skill script is visited with an empty rule set. Canaried: append
`undefinedFunctionCall(thisVarDoesNotExist)` to a script under `.agents/skills/` and `eslint` still
exits **0**. A green `eslint .` is not evidence about any file in this subtree.

So `prettier` is the only check in `verify` that measures a skill script, and it measures layout.
On the change above, three real faults — a `git ls-remote` exit code read as a successful lookup, a
value-taking flag swallowing the next flag and minting into a garbage path under `ok: true`, and an
uncaught `writeFileSync` that would exit with no JSON at all — were found by review and by running
the script. None was reachable by the gate.

A test does not close this by itself: `tsconfig.json` includes only `["src", "*.ts", "*.mts"]` while
`vitest.config.ts` includes `**/*.{test,spec}.ts` greedily, so a `.test.ts` placed here would run
untypechecked — trap 8 by construction, and no skill script has a test today. Prove a skill script
by executing it, and say which paths you ran.

## 12. A git ref lookup reports success over nothing, twice over

Both halves were measured against this repository's own remote while building a skill/package drift
check, and both produce a confident sentence about a comparison that never happened.

**`git ls-remote` exits 0 with empty output for a ref that does not exist.** So an exit-code check
reads a missing tag as a successful lookup. `git ls-remote <url> 'refs/tags/v99.99.99^{}'` exits
**0** and prints nothing; `''.split(/\s+/)[0]` is `''`, not `undefined`, so an `undefined` guard
never fires and the comparison runs against an empty string. Treat empty output as "no such ref",
and report "no such ref" apart from "remote unreachable" — they are different answers and only one
of them is about the network.

**An annotated tag resolves to the tag object, not the commit.** `refs/tags/v0.0.4` returned
`657481b6` while `refs/tags/v0.0.4^{}` returned `d9476f8` — the release commit. Compare the
unpeeled form against a branch head and it differs on every repository that uses annotated tags,
including the ones with nothing wrong, so the check is a vacuous **red**: it shouts on every run and
therefore carries no information on any of them. Peel with `^{}`.

Either half alone passes a one-sided canary. The equality case has to be built to be seen: clone to
a scratch path, `git tag -a` at `HEAD`, and prove the peeled ref equals `HEAD` while the unpeeled
one does not.

## 13. A case-insensitive filesystem silently merges two Conformance cases

macOS APFS and Windows NTFS are case-insensitive by default, so two Conformance cases whose paths
differ **only** by case are one file. The second write wins, the first case's body is gone, and
nothing anywhere reports it — the corpus simply enumerates fewer files than were authored, and every
marker in it is still valid.

Measured 2026-09-11 while adding the `file-names` Module's cases: 41 files written,
**38 on disk**. `AIKB__llm-wiki.md` overwrote `aikb__llm-wiki.md`, `aikb__LLM-Wiki.md` overwrote it
again, and `Corpus.md` overwrote `corpus.md` — so the surviving `aikb__llm-wiki.md` carried a `FAILS`
marker and a body arguing for a name that was not its own. `touch /tmp/x-CaseProbe && ls /tmp/x-caseprobe`
is the one-line host check.

The consequence is a limit on the portable specification, not just an authoring hazard: **a
case-only variant cannot be a Conformance case on a host the suite must check out on.** A case that
needs to exercise case has to differ case-insensitively somewhere else in the stem, and say so in
its own body. Related: design-ADR 0005 and issue #51, which are the same host-dependence reaching
the glob matcher rather than the corpus.

After adding or renaming cases, prove the corpus holds what was authored:

```bash
find fixtures/conformance/docs -name '*.md' | tr 'A-Z' 'a-z' | sort | uniq -d   # empty == no collisions
find fixtures/conformance/docs -name '*.md' | wc -l                            # against the count you wrote
```

## 14. A relocated constraint takes its violation code's corpus coverage with it

Moving a constraint from one field to another keeps every test green while silently emptying the set
of documents that can fail it. The config-validity assertions still pass, the marker verdicts still
agree, and one violation code stops being reachable by anything in the corpus.

Measured 2026-09-11, promoting `kebab-case` to a named format. `pattern` moved off `reference.slug`
and onto `sources[].id` — and both real source ids in `provenance.md` already satisfied the new
regex, so **`PATTERN_MISMATCH` went from reachable to unreachable**: 19 frontmatter codes reached
before the move, 18 after, `npm run verify` exiting 0 both times. The suite asserted that every
`pattern` has a sibling `intent`, which is a claim about the config; nothing asserted that a
`pattern` can still be **disobeyed**, which is a claim about the corpus.

A relocated constraint therefore needs a document written to fail it, in the same change. The
diagnostic is the reached-code set, never the test count:

```bash
npm run build && node dist/packages/cli/cli.js --check --root fixtures/conformance \
  --config fixtures/conformance/valid-test-config.yaml \
  | python3 -c "import json,sys; d=json.load(sys.stdin); \
      print(sorted({v['violation'] for f in d['result']['files'] for m in f['modules'] for v in m['violations']}))"
```

## 15. A corpus that cannot tell two spellings of a constant apart has not specified it

A constant the implementation depends on is only pinned if some case would change verdict when it
changes. Where every case reads the same under both spellings, the corpus says nothing about it and
a mutation goes green.

Measured 2026-09-11 on the `__` segment delimiter. Changing it to a single `_` left the **entire
Conformance suite green**, because an empty part does not count as a part: `a__b` splits to
`['a','b']` under `__` and to `['a','','b']` → `['a','b']` under `_`, so every two-segment name in
the corpus read identically. The fix is one case whose parts differ between the two readings —
`acme_corp__q3-export` is two parts under `__` and three under `_` — and it took the mutation from
green to three failures.

The general form: for each constant the specification names, ask **which case would move** if it
changed. If the answer is none, the constant is documented and unspecified. A whole-suite mutation
probe finds these cheaply — mutate, run, revert, and treat a green as the finding:

```bash
sed -i '' "s/const DELIMITER = '__';/const DELIMITER = '_';/" \
  src/packages/file-names-harness/lib/check/name-stem.pure.ts
npx vitest run src/packages/frontmatter-harness/tests/conformance.test.ts   # must go RED
git checkout -- src/packages/file-names-harness/lib/check/name-stem.pure.ts
```
