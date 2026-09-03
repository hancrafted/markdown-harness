# ablation-runs

Run substrate for the **adr-ablation** experiment.

- Map: [hancrafted/markdown-harness#18](https://github.com/hancrafted/markdown-harness/issues/18) — _Map: adr-ablation — spec, scaffold, runs, scoring_
- Scaffold ticket: [#21](https://github.com/hancrafted/markdown-harness/issues/21) — _Scaffold template, additive arm manifests, and the stamp script_
- Frozen spec: `docs/evals/ablation/implementation-spec.md` @ `ff5bc666cb3fcfbfd8c402fb45b67b70c31641a8`, stamped into each run as `SPEC.md`

Nothing in this directory is merged back. Runs are probes; cherry-picking is allowed.

## What is measured

Three arms × two models. Treatments are **additive layers** on a purpose-built bare
scaffold — never subtractions from markdown-harness.

| arm         | layer                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ |
| bare        | scaffold only                                                                              |
| checks-only | bare + governance eslint blocks + `.dependency-cruiser.cjs` + scripts wired into `verify`  |
| governed    | checks-only + `.archgate/` (all records + companion enforcers) + `.claude/rules/` symlinks |

The measured quantity is the marginal contribution of **the records**, not of the whole
governance bundle as markdown-harness ships it. The bundle is a possible fourth arm (logged
to the map's fog), not an edit to these three.

## Vendored authoring skills

Source: `mattpocock/skills`, installed with `npx skills add mattpocock/skills`.

That command installs **37** skills. Only **three** are vendored into the arms —
`implement`, `tdd`, `code-review` — because several of the other 34 substitute for the
treatment. `domain-modeling`'s own description is "recording or editing an ADR";
`setup-ts-deep-modules` and `improve-codebase-architecture` hand an arm the deep-module
layout `ARCH-004-folders-and-files` asks it to produce. A tool present in every arm that
manufactures the treatment raises the bare arm's floor and compresses the effect under
measurement. Baselines are the one cell that cannot be repaired afterwards.

All three skills are vendored into **every** arm, identically. They are part of the bare
layer, not part of any treatment.

### File inventory (8 files, 14,592 bytes)

| file                             | bytes |
| -------------------------------- | ----- |
| `implement/SKILL.md`             | 433   |
| `implement/agents/openai.yaml`   | 139   |
| `tdd/SKILL.md`                   | 3549  |
| `tdd/agents/openai.yaml`         | 87    |
| `tdd/mocking.md`                 | 1482  |
| `tdd/tests.md`                   | 2214  |
| `code-review/SKILL.md`           | 6588  |
| `code-review/agents/openai.yaml` | 100   |

Upstream ships these as real files, no symlinks.

### Wiring

Real files live in `.agents/skills/{implement,tdd,code-review}/` — Antigravity/Gemini reads
`.agents/`. Relative symlinks `.claude/skills/<name> -> ../../.agents/skills/<name>` expose
them to Claude Code, matching markdown-harness's own convention.

Both surfaces are required. Copying `.claude/skills/` alone yields dangling links, which
fail **silently** — the skill simply isn't there, with no error. Verified failure mode: the
first hand-built attempt at these repos had all 37 skills as real files under
`.agents/skills/` and no `.claude/skills/` directory at all, so none of them were loadable
by Claude Code.

## Edit register

Every modification to a vendored upstream file, why, and its authority. Applied to **all
three arms** identically — an edit in only some arms would itself become a treatment.

### 1. `tdd/SKILL.md:10` — remove the ADR clause

Upstream:

> When exploring the codebase, read `CONTEXT.md` (if it exists) so test names and interface
> vocabulary match the project's domain language, and respect ADRs in the area you're touching.

Edit: delete `, and respect ADRs in the area you're touching`. Keep the `CONTEXT.md` half —
it self-disables via its own "(if it exists)".

Why: told to respect ADRs and finding none, a bare-arm agent may hunt for or author its own
governance file, manufacturing the behaviour the arm exists to measure the _absence_ of.

Authority: ticket #21 (as written).

### 2. `tdd/SKILL.md:26` — remove the `codebase-design` delegation

Upstream:

> When the shape of that interface is itself in question (how deep the module is, where the
> seam belongs, what the interface should expose), call the Skill tool with "codebase-design"
> for the vocabulary. It is the shared source of the module, interface, depth, seam, adapter,
> leverage and locality terms, and it is a reference to consult, not a session to run.

Edit: delete the sentence pair.

Why: the trio is not closed under delegation — this line reaches outside it. The
module/interface/depth/seam/adapter/leverage/locality vocabulary is substantially what
`ARCH-004-folders-and-files` is written in, so shipping `codebase-design` would hand _every_
arm the vocabulary of a record under test. This is the same reasoning #21 uses to refuse
shipping `src/packages/AGENTS.md` to the governed arm.

Authority: #21, resolved in session 2026-09-03 (Q7).

`tdd/SKILL.md` therefore takes **two** cuts, at `:10` and `:26`.

### 3. `code-review/SKILL.md:13` — remove the issue-tracker / skill-install path

Upstream:

> The issue tracker should have been provided to you. If `docs/agents/issue-tracker.md` is
> missing, tell the user to run `/setup-matt-pocock-skills`.

Edit: delete, and repoint the Spec axis at `SPEC.md`.

Why two reasons. No arm has `docs/agents/issue-tracker.md` — map #18 fixes that "arms never
read tickets" — so the branch always fires. And the agent runs under
`--dangerously-skip-permissions`, so it can _act_ on the instruction, `npx skills add
mattpocock/skills`, and acquire `domain-modeling` and `setup-ts-deep-modules` mid-run,
reopening the 37-skill leak from inside the arm. The edit also closes a real functional gap:
the Spec axis needs something to review against, and in every arm that is `SPEC.md`, never
an issue.

Authority: #21, resolved in session 2026-09-03 (Q8).

## Deliberately not edited

Recorded because each was considered and rejected — absence here is a decision, not an
oversight.

- **`code-review/SKILL.md:34-38`** — the Standards axis, its "identify the standards sources"
  step, and the fixed Fowler smell baseline. Kept intact in all arms. The baseline is an
  explicit fallback for repos that "document nothing", so it gives the bare arm a _uniform
  floor_ rather than prompting it to invent governance — unlike `tdd:10`, which said "respect
  ADRs" and thereby implied ADRs ought to exist. More importantly this step is the mechanism
  by which the governed arm's records actually get consumed during review; stripping it would
  blunt the governed arm's advantage and bias the experiment toward the null. A bare agent
  authoring its own `CODING_STANDARDS.md` is a genuine outcome worth measuring, not an input
  to suppress. Authority: #21 (Q9).
- **`implement/SKILL.md:15`** — "Commit your work to the current branch." Kept; it is the only
  commit instruction in the trio and it feeds the `git log --numstat` churn metric.
- **The other 34 skills** — not vendored at all. See _Vendored authoring skills_ above.

## Integrity checks at harvest

A run is **disqualified**, not merely noted, if any of these appear:

- Any addition under `.agents/skills/` or `.claude/skills/` in `git log --numstat` — the agent
  self-installed skills.
- Any modification to a file under `.archgate/` in a governed run — the agent edited its own
  governance rather than complying with it.
- Any `archgate`, `.archgate/`, or `dependency-cruiser` artifact present in a **bare** run that
  the stamp did not place there.

## Known properties of the governed arm

Not defects; recorded so they are not mistaken for run artifacts.

- `archgate check` emits four briefing warnings on every invocation, sections over the 2000
  character cap: `GEN-001 Decision 5232`, `ARCH-001 Decision 4784`, `ARCH-004 Decision 3732`,
  `ARCH-003 Decision 2199`. Shipped uncompressed on purpose — editing any record would change
  the governed arm's treatment, and map #18 rules record edits out of scope for this route.
- Companion `.rules.test.ts` files are **not** shipped. They are markdown-harness's tests of its
  own enforcers, not artifacts an arm is asked to produce, and `ARCH-002-conformance-suite` and
  `ARCH-003-testing` are themselves records under test _about testing_. Vitest's
  `**/*.{test,spec}.ts` would otherwise collect them: measured, the governed arm booted with 37
  green tests against the bare arm's 0, making the functional gate structurally different per
  arm. Only the acceptance kit supplies tests. Authority: #21 (Q5).
- `archgate check` is changed-files-scoped against `baseBranch`, so `total: 0` means _nothing in
  scope changed_, never _governance passed_. Each run's `baseBranch` points at its own initial
  scaffold commit, not `origin/main` — no run repo has a remote.

## Record provenance

Records are **symlinked** in the governed template and **dereferenced into real files** when a
run is stamped (`rsync -aL`). Probed 2026-09-03:

- `archgate` follows symlinked records — discovery and enforcer execution both work
  (`total 1, passed 1, ruleErrors 0`).
- But git stores a symlink as mode `120000` whose blob is the _absolute path_, so a run's own
  history — which map #18 calls a scored artifact — would record a filesystem path instead of
  the governance the run was held to, and would not be reconstructible.
- And the source record is **writable through the link**: an agent under
  `--dangerously-skip-permissions` editing `.archgate/adrs/*.md` would edit markdown-harness
  itself, silently changing the treatment of every other governed run.

Dereferencing on stamp keeps the template trivially in sync with source while giving each run
frozen, self-contained, byte-identical real files with no write path back.

`.claude/rules/` symlinks are **regenerated** after the copy rather than dereferenced —
`GEN-002-adr-symlink-claude-rules` governs that symlink relationship, so turning those links
into real files would fail the governed arm's own enforcer.

## Tooling

Two scripts. Templates are **generated**, never hand-maintained.

- **`build-arm-templates.sh`** — stacks `layers/bare/`, `layers/checks/` and `layers/governed/`
  into the three arm templates. Run when a layer or the record set changes. The layers hold the
  only copy of the shared bare layer, so it cannot drift between arms. Evidence for generating
  rather than typing three times: the first hand-built attempt had already drifted,
  `vitest.config.ts` differing between arm 1 (179 bytes) and arms 2-3 (206 bytes, carrying
  `passWithNoTests: true`). That is the _shared_ bare layer differing across arms, and it
  changed the functional gate — arm 1 failed `vitest run` on an empty `src/` where arms 2-3
  passed it. Nobody decided that. Authority: #21 (Q10).
- **`create-run-repo.sh <arm> <model> <n>`** — mints one run, as a single transaction. Refuses
  to proceed unless markdown-harness is clean and at the source SHA declared above; copies the
  template with `rsync -aL` so symlinked records dereference to frozen real files; regenerates
  `.claude/rules/` relative symlinks; stamps `SPEC.md`, the acceptance kit, `PROMPT` and
  `PROVENANCE`; `npm install`; `git init` plus one scaffold commit; points `baseBranch` at that
  commit; prints the exact launch command for the model. Authority: #21 (Q11).

The refusal-to-stamp gate exists because the map permits top-up runs later. Without it, a
top-up joins a _different_ experiment than the original nine, and nothing in the artifacts
would say so.

### Vocabulary note

Map #18 and ticket #21 use **stamp** as a verb — "one fresh repo per run, stamped by script",
"stamped into every scaffold at a recorded SHA". The scripts deliberately avoid that word in
favour of self-describing names, so there is no `stamp.sh` in this repo. Read "stamp a run" in
the tickets as `create-run-repo.sh`. Authority: #21 (Q12).

## Layout

```
~/Developer/ablation-runs/
├── README.md                                 this file
├── layers/
│   ├── bare/                                 scaffold: package.json, tsconfig, vitest,
│   │                                         prettier, SPEC placeholder, 3 vendored skills
│   ├── checks/                               + governance eslint blocks,
│   │                                         .dependency-cruiser.cjs, scripts into verify
│   └── governed/                             + .archgate/ (symlinked records) + .claude/rules/
├── build-arm-templates.sh
├── create-run-repo.sh
├── markdown-harness-no-adr-no-checks/        bare template      — generated, never run in
├── markdown-harness-with-checks/             checks-only template
├── markdown-harness-with-adr-and-checks/     governed template
└── run-01/ … run-09/                         minted runs, flat and opaque
```

Run directories are **flat and opaque**. They never name their arm, their model or their run
index, because an agent's working directory is visible to it — the host harness places the cwd
in the agent's environment, and `pwd` works regardless, so this is not a channel `.gitignore`
can close. The `run-NN` → arm/model/n mapping is held in each run's `PROVENANCE` and in
markdown-harness's `docs/evals/ablation/runs/`, never in the path.

Arm templates keep descriptive names precisely because they are never run in. Note the first
hand-built attempt misspelled one of them (`markdown-harenss-…`); the generated names are
authoritative.

## Recorded residual risks

Known, accepted, and worth checking against the transcripts at scoring time rather than
pretending they are closed.

- **`ablation-runs` appears in every run's path.** A run's working directory reads
  `~/Developer/ablation-runs/run-03`, so an agent that reasons about its cwd can learn it is
  inside an experiment, even though the arm is hidden. The spec's own freeze gate forbids
  mentioning "ablation", so this partially reopens a channel the spec closes. Accepted in
  preference to relocating the workspace. At scoring time, treat any transcript in which the
  agent reasons about being measured as a data point, not as noise.
