# markdown-harness

`CLAUDE.md` is a symlink to this file. Edit `AGENTS.md`.

## Naming

Two things in play are called harnesses, and the industry calls a Host harness a harness too. Always qualify:

- **`markdown-harness`** — this product.
- **Host harness** — the agentic CLI running the agent: Claude Code, Codex, Antigravity.

Bare "harness" is ambiguous. Ask which is meant. With nobody there to ask, name both readings and proceed with the one the current file path implies.

## Decision records

Two separate systems, never interchangeable:

- **ADR** — Archgate governance records in `.archgate/adrs/` (`ARCH-001`, `BE-001`, …). Created and edited **only** by `archgate:adr-author`; other skills delegate to it.
- **design-ADR** — design decisions from the Matt Pocock skills in `docs/design-adr/` (`0001-slug.md`), each starting with `type: design-adr` as the first frontmatter field.

Use the precise term. The Matt Pocock skill files still say ADRs live in `docs/adr/` — in this repo they don't; see `docs/agents/domain.md`.

## Vision

Neither file below is a decision record. They hold the reasoning decisions get derived from, and each opens with the test to run before proposing anything.

- `docs/vision/product.md` — the promise, the two roles, the boundaries, the horizons. Read before proposing a feature, arguing scope, or writing adopter-facing copy.
- `docs/vision/architecture.md` — the tenets, and four decisions that are cheap now and expensive later. Read before adding a dependency, a config key, a write path, or an integration surface.
- Issue #1 — provisional feature decisions, what was withdrawn and why, and every fact measured so far. Read before designing a feature, reopening a trade-off, or measuring something a second time.

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues (`hancrafted/markdown-harness`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, design-ADRs in `docs/design-adr/`. See `docs/agents/domain.md`.

## Source layout

Packages under `src/packages/` are deep modules, and every file carries exactly one classifier — by position at a Package root, by suffix below it. Read [`src/packages/AGENTS.md`](./src/packages/AGENTS.md) before adding, naming, or importing a file there — `src/packages/CLAUDE.md` is a symlink to it, so it also loads on its own.

## Verification

`npm run verify` is the gate. Seven traps inside it.

**1. `archgate check` is changed-files-scoped.** It evaluates only ADRs whose `files:` glob matches a file changed against `baseBranch` (`.archgate/config.json`), and explicit path arguments are intersected with that same set. So `total: 0` means _nothing in scope changed_ — never _governance passed_. To exercise the rules deliberately, give it a base that reaches an ADR edit: `npx archgate check --base HEAD~3`.

**2. `verify` is not trustworthy inside an agent worktree.** A Host harness that isolates an agent puts the worktree under `.claude/worktrees/` — inside this repo — and installs it incompletely: `node_modules/.bin` comes out empty. `knip` then reports every devDependency unused and every binary unlisted, and the same nesting makes typescript-eslint fail all files with _"multiple candidate TSConfigRootDirs"_ from the repo root. Both are artifacts of the location, not of the diff.

So a worktree agent must not conclude "this failure is pre-existing" by stashing and re-running _in the worktree_ — the baseline is contaminated the same way. Re-run `verify` from the real root after merging, and treat a worktree's green or red on `knip` and `eslint` as unmeasured. But install it first: measured 2026-09-04 in a `.worktrees/` worktree — the second worktree location this repo uses, so the diagnosis is not specific to the `.claude/` path — `node_modules/` was present and empty, `knip` reported all eleven devDependency binaries unlisted, and `eslint` passed, so the two halves of this trap do not fail together. `npm ci` inside the worktree took `node_modules/.bin` from absent to 32 entries and `npm run verify` to exit 0 including `knip`. An installed worktree is measurable; "unmeasured" is the fallback when installing is impossible, not the first move.

**3. The ADR size budget counts characters, not bytes.** `wc -c` overstates by two per em dash, and this repo's ADR prose is full of them — enough to misreport a record by a hundred characters and to disagree with the figure `archgate check` prints. Measure with something character-aware, and when planning a cut, trust `archgate check`'s number over the shell's.

**4. An enforcer's rule count comes from evaluating its array, never from grepping it.** A `## Compliance and Enforcement` section that states how many checks hold a Discipline makes a claim a reader will trust and nothing will verify. The configs here build those arrays from a list — `['TSInterfaceDeclaration', ...].map(...).concat([...])` — so the `selector:` key appears once inside the map callback and generates one entry per node type. Grepping counts that callback as a single selector and undercounts the group: this is how six selectors shipped as four. Extract the expression, run it, and print `.length` before writing the number down.

**5. A boundary check reports green while cruising nothing.** `dependency-cruiser` sees only post-compilation edges unless `tsPreCompilationDeps: true` is set, so every `import type` and `export type … from` is erased before the rules run. A Package whose edges are all type-only — `config-contract` holds nothing but type declarations — therefore satisfies all six of `ARCH-004`'s boundary rules by presenting no visible edges at all, and `npm run lint:boundaries` still prints `✔ no dependency violations found`. The counts in that same line are the only signal that distinguishes the two cases: `7 modules, 3 dependencies` with the flag off and `7 modules, 7 dependencies` with it on describe the identical tree. Read the dependency count, not the checkmark — and expect it to fall to near zero exactly when the last file holding a runtime import leaves `src/`.

**6. `archgate check`'s `briefingWarnings` is empty now, so a warning there is signal.** It used to be non-empty on every invocation — four records carried a `Decision` section over the 2,000-character briefing cap — and the standing instruction was to ignore it. That is no longer true: the compression commits took all four under the cap and `briefingWarnings` measures `[]` against every base. [#28](https://github.com/hancrafted/markdown-harness/issues/28) is still **open** — nobody closed it — so read the tree rather than the ticket here, in both directions: an open #28 no longer means warnings are expected. Two of the four sit close to the line, `ARCH-003` at 1,999 characters and `ARCH-004` at 1,928, so **one added sentence in either `Decision` reopens the warning** — which is why this trap is now the opposite of what it was. Do not carry forward the habit of dismissing the array; a warning in it today names something your change did.

**7. A repo-wide formatter can brick the mint, and the refusal will not say so.** Two trees are pinned by content hash — `docs/evals/ablation/kit/**` against `assets/kit.sha256`, and the stamped assets against `assets/assets.sha256` — and `preflight.sh` refuses to mint a run when a pin and its tree disagree. `prettier --write .` over either tree therefore produces a refusal that reads as tampering, over a reformat nobody chose, and the message names the drift rather than the cause. Both are in `.prettierignore` with that reason attached, and the same care is owed to anything pinned later: **a content pin and a repo-wide `--write` are incompatible unless the pinned path is ignored.** The held-out fixtures are ignored for a neighbouring reason — they are deliberately malformed, and formatting them would repair the defects they exist to present. `fixtures/conformance/docs/plain/broken/**` joins them on the same grounds. Scope an entry like that to the directory, never to the files that fail today: of the four malformed blocks there, only the unclosed fence moves under `prettier --write` — prettier leaves a block it cannot parse alone — so which shapes survive formatting is an accident of the parser rather than a property anyone chose.
