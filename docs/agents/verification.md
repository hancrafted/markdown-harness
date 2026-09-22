---
type: agent-guide
---

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
`fixtures/conformance/frontmatter/docs/plain/broken/**` joins them on the same grounds, as does
`fixtures/conformance/rejected-config/**`. Scope an entry like that
to the directory, never to the files that fail today: of the four malformed blocks there, only the
unclosed fence moves under `prettier --write` — prettier leaves a block it cannot parse alone — so
which shapes survive formatting is an accident of the parser rather than a property anyone chose.

**An ignore entry is a path, so moving the tree breaks it silently.** The corpus moved into tiers on
the same commit that moved these two entries, and the entry left behind would not have errored: it
would have matched nothing, prettier would have reformatted the malformed blocks, and `format:check`
would have failed naming the reformatted case rather than the stale entry. Move the entry in the
same commit as the tree, and prove it by removing one and reading the exit.

**The rejected-config tier fails louder than that, so it earns its own entry.** A malformed markdown
case is silently reformatted; an unparseable **YAML** case is not. Measured over the candidate tier,
then named `fixtures/conformance/config/`, of fifteen case directories — it landed as
`fixtures/conformance/rejected-config/` — with the tier unignored,
`npx prettier --check .` exits **2** with `SyntaxError: A block sequence may not be used as an
implicit map key`, so `npm run verify` dies at the format step and never reaches `vitest`, `tsc` or
`knip`; with the directory ignored it exits 0. The parseable-but-invalid configs and their goldens
take the softer half of the same trap — both measured `[warn]`, so `prettier --write .` would rewrite
the bytes under test. `fixtures/conformance/rejected-config/**` therefore belongs in
`.prettierignore`, scoped to the directory on the same grounds as the entry above.

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

## 13. A gate appended to `verify` does not run in CI

`.github/workflows/ci.yml` does **not** invoke `npm run verify`. It duplicates that chain as eight
separately-named steps, on purpose, so each check fails under its own name — and its own comment
records the standing cost: "a change to that script has to be made here too." Only
`publish.yml` runs `verify`, and only on a tag.

So a check appended to `verify` alone runs at publish time and **never on a pull request**, which is
the run that gates the merge. Every PR stays green over a check that did not execute. The symptom is
indistinguishable from the check passing, and worse than a vacuous green: the check is real, it
works, and it is simply never reached on the path that matters.

Measured 2026-09-09 adding `mh --check` for issue #57: appended to `verify`, it passed locally on
every run while `ci.yml` had no step for it at all.

**The gate is whichever command CI actually runs, which is not reliably the one named `verify`.**
Read the workflow before appending to a script, and add the step in both places. Prove it the same
way as anything else here — break what it guards, push, and watch the PR go red, not the tag.

## 14. A read of a file can come back short, and nothing reports that it did

Every other trap here is a check reporting success over nothing. This one is worse, because it
corrupts the evidence the other fourteen are read with: **a read in this environment can silently
return less than the file holds, and succeed while doing it.**

Two channels, both measured:

- **The shell proxy drops tokens.** `cat`, `grep` and `find` return prose with words missing and
  exit 0. Nothing is truncated at a boundary you can see — words vanish mid-sentence, so the output
  still parses as English and still looks complete. A `grep -n` hit count can be right while the
  matched lines come back clipped.
- **The file-reading tool drops content on whole-file reads.** The same file read in one call loses
  material that the same file read in windows of thirty lines or fewer returns intact. One agent
  measured a whole-file read losing roughly a quarter of the file's content, with no error and no
  marker where the loss occurred.

Three agents confirmed this independently across three separate tickets. Two of them separately
reported an instruction present in the environment telling them to prefer `cat` and `grep` over the
file-reading tool, and correctly ignored it: that instruction points at the channel that drops the
most.

The failure mode is what makes it dangerous. A short read of prose reads as prose. A short read of a
**conflict region** reads as a resolvable conflict — the markers survive, the text between them does
not, and a resolution written against the clipped text drops a decision nobody will see missing.

**The technique that works, in the order it costs least:**

1. **Read in narrow windows.** Thirty lines is the measured ceiling; fourteen has held across every
   file tried here. Windows overlap at their edges, so a boundary is read twice.
2. **Cross-check through edit anchors.** An `Edit` whose `old_string` is copied from what you read
   fails loudly on mismatch. That is the cheapest available proof that what you read is what the
   file holds — a failed anchor is a short read confessing. Prefer an anchored edit over a
   whole-file rewrite for exactly this reason: a rewrite cannot fail this way.
3. **Verify behaviour by running the tool, never by reading the source that implements it.** Counts,
   sizes and rule sets come from executing the thing — `archgate check`'s own report for a record's
   size, an evaluated rule array for its length (trap 4), a real run for a glob's reach. Source read
   for a number is source that may have arrived short.
4. **Take numbers from a program, not from a terminal.** Where a count decides something, compute it
   in a script that writes its own answer, rather than eyeballing piped output.

The trap has no canary, because a short read cannot be planted. What it has is a habit: assume every
read is partial until an anchor, a re-read at a different window, or a tool's own output agrees with
it.

## 15. A refusal upstream can leave a guard that cannot be reached

A guard goes permanently green when something earlier refuses to produce the case it checks. Its
logic may be perfectly correct. It is simply never reached, so it re-proves nothing on any run — and
the reachable sibling nobody guarded is free to crash.

Measured in #160. The walk refuses to descend into a symlinked directory, so a corpus cycle _through
directories_ is never entered. Handling for that cycle therefore reads as held: plant the cycle, the
walk answers a report, the assertion passes. It passes with the handling deleted, too. The cycle that
was actually reachable ran through **files** — `knot-a.md → knot-b.md → knot-a.md` — and it raised
`ELOOP` out of `statSync` and killed the walk with a stack trace. `throwIfNoEntry: false` suppresses
`ENOENT` and nothing else, so the one shape the code appeared to cover was the one shape it could not
meet.

Two symptoms read as this trap. A planted violation that cannot be constructed without first
disabling something else is one. A pair of cases where one is structurally impossible and its sibling
is untested is the other. Ask which refusal upstream makes the case unreachable, then ask what that
same refusal does **not** cover — the residue is where the crash lives.

The repair is not a second guard. Delete the unreachable handling and test the reachable sibling: a
ledger for a case that cannot occur is one more check that can never go red.
