# ADR ablation — methodology

This document is the reproducibility record for the ablation study designed on map
[#18](https://github.com/hancrafted/markdown-harness/issues/18). It answers one question: **how do
I reproduce a cell?** Everything needed to stamp a scaffold, launch a run, capture its telemetry,
and file a run record is here. The frozen spec (`implementation-spec.md`) is the arm-facing input;
this document is the operator-facing protocol.

## The question

Which of the eight provisional governance records change what agents build?

The records under test are every ADR in `.archgate/adrs/` except `GEN-001-adr` (the meta-record
that governs ADR authoring itself). That leaves:

| id         | name                     |
| ---------- | ------------------------ |
| `ARCH-001` | dependency-admission-bar |
| `ARCH-002` | conformance-suite        |
| `ARCH-003` | testing                  |
| `ARCH-004` | folders-and-files        |
| `ARCH-005` | file-suffix-types        |
| `ARCH-006` | file-suffix-pure         |
| `ARCH-007` | file-suffix-impure       |
| `GEN-002`  | adr-symlink-claude-rules |
| `GEN-003`  | codebase-hygiene         |

Each is a written hypothesis until the instrument reports. A record that bare arms violate **binds**
— meaning its constraints are not model defaults. Zero delta between governed and bare means
redundant-with-model-defaults. Binding is not the same as good; the scoring layer asks whether
compliance correlated with better output.

## Arms and layers

A 3 × 2 matrix: three treatment levels, two models.

| arm             | contents                                                        |
| --------------- | --------------------------------------------------------------- |
| **governed**    | records + deterministic enforcers + symlinks + governance prose |
| **checks-only** | deterministic enforcers only (no records, no prose)             |
| **bare**        | nothing — the scaffold alone                                    |

| model                 | host harness | notes                                                            |
| --------------------- | ------------ | ---------------------------------------------------------------- |
| Sonnet 5              | Claude Code  | n = 2 per cell (6 runs, scripted AFK)                            |
| Gemini 3.8 Flash high | Antigravity  | n = 1 per cell (3 runs, manual launch); top-ups to n = 2 allowed |

### The additive-manifest principle

Treatments are **additive layers** on a purpose-built scaffold, never subtractions from this
repository. Each arm has a manifest — a list of files the stamp script copies into the scaffold on
top of the bare layer. The governed arm's manifest is a superset of the checks-only arm's, and the
bare arm's manifest is empty. This means:

- No arm receives something and has it taken away; the treatment _is_ what was added.
- A file that appears in a run was either stamped by the script or authored by the agent. The
  manifest is the partition.

The bare layer is shared, and it is **almost** byte-identical across arms. Two files differ, and
they are enumerated here because an earlier version of this document claimed no file did — which
is how a `vitest.config.ts` that differed between arms once changed the functional gate with
nobody deciding it:

| file               | governed adds                  | why it is not a divergence                                                                          |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `vitest.config.ts` | `exclude: […, '.archgate/**']` | the shipped enforcer tests would otherwise boot this arm on a green baseline the others cannot have |
| `.prettierignore`  | `.archgate/rules.d.ts`         | a generated file the format check would otherwise fail this arm on, for something no arm authored   |

Both lines exist to make the gate **equivalent**, not to change it, and neither can be hoisted
into the shared layer: `.archgate` is record vocabulary, and the per-run leak sweep refuses it in
a bare or checks-only tree for good reason. `assets/assets.sha256` pins all three layer sets, so
any further divergence is a deliberate re-pin rather than a drift.

### `verify` is a different gate in each arm

This follows from the treatment being the checks, but it has a consequence worth stating outright:

| arm         | `npm run verify`                                                        |
| ----------- | ----------------------------------------------------------------------- |
| bare        | `prettier --check` → `tsc --noEmit` → `vitest run`                      |
| checks-only | `eslint` → `prettier` → `tsc` → `depcruise src` → `vitest run` → `knip` |
| governed    | `archgate check` → the checks-only chain                                |

So **"verify green" is not a comparable outcome**. A bare run that reached green cleared three
checks; a governed run cleared seven. Two further asymmetries the arm table above understates:
the bare arm ships **no `eslint.config.mjs` at all**, so the step from bare to checks-only adds
baseline lint hygiene as well as the governance blocks; and `knip` (dead-code detection, not
governance) enters at the same step. The checks-only arm's marginal effect is therefore not
attributable to governance enforcement alone, and the scoring layer must not read it that way.

The only gate common to all three arms is the frozen acceptance suite plus `tsc` and `prettier`.
That is the comparable functional axis; everything else is treatment.

### Authoring skills

Three skills ship in the bare layer (every arm gets them): `implement`, `tdd`, `code-review`. They
live at `.agents/skills/` with symlinks from `.claude/skills/`. One clause is stripped before
vendoring: the `tdd` skill's "and respect ADRs in the area you're touching" is removed in **all**
arms. The `CONTEXT.md` half self-disables via its own "(if it exists)". Reason: told to respect ADRs
and finding none, a bare-arm agent may hunt for or author its own governance, manufacturing the
behaviour that arm exists to measure the absence of.

Antigravity has no known skills mechanism. The three Gemini cells take their methodology from
`SPEC.md` §7 prose only.

## Cohorts

**Runs are comparable only within one `scaffold_sha`.** That field is a content hash of the whole
minted tree — layers, derived check configs, records, vendored skills, the stamped spec — computed
before the scaffold commit, excluding only `node_modules`, `package-lock.json`, `.git` and
`PROVENANCE` itself. It is recorded in the run's `PROVENANCE` and in the operator sidecar, and
`verify-run.sh` recomputes it from the tree.

`source_sha` cannot do this job, for two reasons that both showed up in practice:

- **A commit can be amended out of existence.** One run on record carries a `source_sha` that
  resolves to `fatal: bad object`. Its treatment is unidentifiable.
- **The checks and governed layers are derived at mint time, not stored.** `lib/layers.sh` reads
  `eslint.config.mjs` and `.dependency-cruiser.cjs` out of the source repository and strips them
  per variant, and copies `.archgate/` live. The commit was the only record of what they held.

Recorded so it is not rediscovered: the runs minted on **2026-09-03 fall into two cohorts**. The
governed arm at `2745cf4` and the governed arm at `40e43a2` differ by 74 insertions and 188
deletions across `ARCH-001`, `ARCH-003`, `ARCH-004`, `GEN-001` and GEN-001's enforcer, because
record edits landed between the two mints. The vendored `implement` skill's description differs
across the same boundary. Both mints reported clean. Nothing in either tree distinguished them,
which is the whole argument for a cohort key.

`prepare-batch.sh` reports the cohort of every cell it mints and fails the batch if one variant
lands in more than one — the failure mode being a source-repo commit made _between_ two cells,
which passes the per-cell preflight every time.

## Isolation

**One fresh repository per run**, stamped by script, outside this repository. No worktrees: shared
refs leak sibling arms via `git log --all`, and each run's own git history is a scored artifact
(`git log --numstat` for churn).

The stamp script:

1. Creates a new directory and initialises it as a git repo.
2. Copies the bare layer: `package.json` (no `bin` field — declaring `bin.mh` is the arm's first
   act), `tsconfig.json`, the frozen spec as `SPEC.md` (pinned at a recorded SHA), the acceptance
   kit (renamed from `*.acceptance.ts` to `*.test.ts`), empty `src/`, a neutral one-line
   `CLAUDE.md`/`AGENTS.md`, and the three authoring skills.
3. Applies the arm's additive manifest (governed or checks-only; bare adds nothing).
4. Commits the initial state.

Each scaffold is self-contained: `npm install` from a lockfile, then the prompt, then done.

## Run protocol

### The prompt

Identical, verbatim, across all nine runs. The prompt is recorded alongside this document. It
references only `SPEC.md` and `npm run verify` — it never names ADRs, governance, or this
repository.

### Flags

Identical flags within each host harness:

| flag        | Claude Code                             | Antigravity                          |
| ----------- | --------------------------------------- | ------------------------------------ |
| permissions | `--dangerously-skip-permissions`        | (default: no permission gate)        |
| settings    | `--setting-sources project,local`       | —                                    |
| RTK hook    | disabled (by `--setting-sources`)       | —                                    |
| MCP         | `--strict-mcp-config --mcp-config '{}'` | —                                    |
| output      | result envelope JSON                    | stream-json teed live to `run.jsonl` |

The treatment lives in the tree, never in the flags. No flag differs between arms of the same
model.

### Stall guard

A shared wall-clock stall guard applies to both harnesses. A run that stalls or enters `WAITING`
status is recorded as-is: **stall is a result**, never resumed or steered. `status` is recorded, not
just exit code — a `WAITING` end exits 0 and is not a completed run.

### What the operator does not do

- No steering, no hints, no follow-up prompts after the initial prompt.
- No editing the scaffold during or after the run.
- No resuming a stalled run.

## Metrics

Metrics are captured per run and compared **within model only** — Sonnet-to-Sonnet, Gemini-to-Gemini.
Cross-model comparison is out of scope. And within cohort: see above.

### Collected after the session, never during it

`collect-metrics.sh` runs once the session is closed, operator-side, and nothing it produces is
written back into the run. Both halves matter:

- **Never written back.** Telling a run that its record reads are being counted is the one
  measurement that would change what it measures.
- **Never during.** The first four runs stamped a `metrics.sh` into the tree and had the agent
  append its output to `RESULTS.md` as a final act. Every figure it produced was partial by
  construction — taken from inside the session, it excluded the commits and the report text
  written after it. Worse, it did not fail the same way twice: the governed fable run appended
  its telemetry and never committed it, so `RESULTS.md` sits at 138 lines in its history against
  278 on disk and its own report is outside its scored git artifact; the bare sonnet run
  committed afterwards, so its 227 lines are all in the numstat. **Churn is therefore not
  comparable across those four runs at all** — the report text is inside some numstats and
  outside others. Duration is not repairable for any of them.

**Duration is `started` to the last commit**, not to the clock when the operator gets around to
it. The in-run `AGENTS.md` instructs the run to commit its report as its final act so that stamp
exists. A run whose HEAD is still the scaffold commit produced nothing, and the collector says so
rather than reporting the gap to the mint as a session length.

**`--harness` is required at mint.** Everything below forks on it, and the eleven runs minted
before it was enforced all recorded `unknown` — which makes a missing token table unreadable,
since an unmetered harness and an unparsed transcript look identical in the output.

### Claude Code (Sonnet 5)

The result envelope is the primary telemetry source. Capture the **complete** JSON, never one field.

**Result envelope fields:**

| field                | notes                                              |
| -------------------- | -------------------------------------------------- |
| `modelUsage`         | input/output tokens (including subagent usage)     |
| cache tokens         | cache read/write token counts                      |
| `permission_denials` | should be 0 under `--dangerously-skip-permissions` |
| `status`             | terminal state                                     |

**OTel metric names** (console output):

| metric                | notes                   |
| --------------------- | ----------------------- |
| `lines_of_code.count` | total lines authored    |
| (other counters)      | as emitted; capture all |

### Antigravity (Gemini 3.8 Flash high)

The SQLite store does not persist token counts, so a run without live capture is an **unmetered
run**. Telemetry must be captured during the run, not reconstructed afterwards.

**Usage fields** (from stream-json):

| field              | notes                 |
| ------------------ | --------------------- |
| `thinking_tokens`  | reasoning token count |
| `duration_seconds` | wall-clock duration   |
| `num_turns`        | agent turn count      |
| `status`           | terminal state        |

**Stream-json `step_update`** events carry tool calls — record them for the inspection tour.

**Not available in agy:** OTel metrics, a cost field, a turn cap. Token counts are in usage, not in
a SQLite store.

### Cost

Cost is **computed, not read** — flagged as an estimate in every table. Compute from token counts
and the model's published pricing at the time of the run. Do not present computed cost as measured
cost.

### Churn

Code churn is measured via `git log --numstat` against the scaffold's initial commit. This captures
lines added/removed per file, making the agent's editing pattern observable — a heavy rewrite cycle
reads differently from a clean vertical build.

## Scoring

Scoring is layered: each layer filters or enriches the one above it.

### Layer 1: functional gate

The acceptance suite (`tests/acceptance/*.test.ts`, from the kit) is the binary gate. A run whose
suite is not green is **non-functional** — excluded from shape scoring, recorded as a result. The
gate uses three configs:

| config                           | frozen verdict                                                 |
| -------------------------------- | -------------------------------------------------------------- |
| `valid-test-config.yaml`         | `governedFiles: 24`, `invalidFiles: 15`, `totalViolations: 22` |
| `governs-everything-config.yaml` | walker observable; exactly one governed file survives          |
| `empty-rule-list-config.yaml`    | one fault, `CONFIG_EMPTY_RULE_LIST`, exit 2                    |

All 18 violation codes must be reached.

**This layer saturates.** All four runs completed before 2026-09-04 reached `24/15/22` on the
first config, so as a discriminator between arms it reported nothing. That is not a defect in the
suite — it is a frozen gate doing its job — but it means the study cannot rest on it, and the
layers below it are either arm-favouring by construction (layer 2 scores bare output against
records it never saw) or subjective (layer 3).

### Layer 1b: held-out edges

`docs/evals/ablation/held-out/` is a second suite, applied at scoring time over a run's output
tree. **No run ever receives it**: `copy_kit` stamps `kit/fixtures` and `kit/tests` only, and the
held-out directory is neither.

It exists because the four completed runs diverged on ten behaviours that the frozen corpus never
exercises, and every one of them was volunteered in a `RESULTS.md` under "where the spec ran out".
Two runs let an unparseable frontmatter block report under different code names; two disagreed on
whether an empty string satisfies `allOf`; two disagreed on whether a repeated `--root` is a usage
error; one let a non-existent `--root` throw an uncaught `ENOENT` while another answered exit 0.
None of it was scoreable, because the spec delegated it and the corpus never reached it.

Both halves of the fix are needed. The spec now **defines** those behaviours (§2, §3.3, §3.5,
§4.6, §4.7) so they are determinate and gradeable; the suite stays **held out** so no run can
teach to it. A delegated behaviour cannot be scored, and a published test can be satisfied without
being understood.

The held-out suite is **not** part of any arm's `verify` and is not a functional gate: a run that
fails it is not non-functional. It is a graded axis, reported per run as a pass count.

### Layer 2: per-record mechanical differential

For each checks-only and bare run that passed the functional gate:

1. Restore the full governance layer (records + enforcers + symlinks) over the run's output tree.
2. Run the enforcers and `archgate check`, mapped onto the output tree.
3. Tabulate violations per record per run.

**Semantics:** a record that bare arms violate **binds** — its constraints are not what the model
produces by default. Zero delta means redundant-with-model-defaults. Binding is distinct from
"good"; a binding record might constrain something the model already does well, and a non-binding
record might cover something the model happens to get right without guidance.

Before scoring any record as violated, verify that the spec left compliance **possible**. A forced
violation is a fixture defect, not a record that failed to bind. Report it as such.

**Normalization** (raw violation counts vs per-file rates) is decided in the scoring ticket against
real output — map fog 2.

### Layer 3: blind rubric

A reviewer model scores each run's output. The reviewer:

- Is **never handed the ADRs** — it cannot prefer the governed arm by recognising the vocabulary.
- Does not know which arm produced which output.
- Uses a rubric whose contents are decided in a separate grilling session (map fog 1) — this
  section records the protocol, not the rubric itself.

The same reviewer model is used for all runs within a model cohort.

### Layer 4: entry-point placement

The spec pins no entry-file path — each arm declares its own in `package.json` under `bin.mh`. Where
the CLI entry lands, and whether it sits inside a Package, is direct evidence on
`ARCH-004-folders-and-files` rather than something the fixture decided. Read `bin.mh` first on every
run.

## Run-record schema

Each run produces a record at `docs/evals/ablation/runs/<run-id>.md`, where the run id is the
directory the mint script produced — `20260904-build-initial-cli-governed-1-sonnet-5`. The id
already encodes date, task, variant, repeat and model, so the record needs no separate cell name.

The record is read top-down by someone deciding whether this run is worth opening. So it opens on
the verdict and the numbers, carries the commands to reproduce it in the middle, and keeps the
reasoning last — the reasoning is the run's own `RESULTS.md`, which this record points at rather
than restates.

````markdown
# <run-id>

**<completed · stalled · waiting · errored>** — functional gate <pass · fail>, <n> of 3 configs
green, ~$<estimated cost>, <duration>. <One sentence: the single thing a reader should know.>

## Telemetry

| metric             | value |     | metric        | value |
| ------------------ | ----- | --- | ------------- | ----- |
| input tokens       |       |     | wall-clock s  |       |
| output tokens      |       |     | turns         |       |
| thinking tokens    |       |     | files changed |       |
| cache read tokens  |       |     | insertions    |       |
| cache write tokens |       |     | deletions     |       |
| harness            |       |     | cohort        |       |

`cohort` is the run's `scaffold_sha` (first 12 is enough). A record without it cannot be compared
to anything, so it is a required field rather than a nicety.

Cost is **computed, not read** — token counts times published pricing at run time. Never present
it as measured.

## Scores

### Functional gate (layer 1)

| config                         | pass/fail | governedFiles | invalidFiles | totalViolations |
| ------------------------------ | --------- | ------------- | ------------ | --------------- |
| valid-test-config.yaml         |           |               |              |                 |
| governs-everything-config.yaml |           |               |              |                 |
| empty-rule-list-config.yaml    |           |               |              |                 |

### Per-record differential (layer 2)

| record | violations | binds? |
| ------ | ---------- | ------ |

### Held-out edges (layer 1b)

| edge | spec | expected | observed | pass |
| ---- | ---- | -------- | -------- | ---- |

### Rubric (layer 3)

| axis | score | reviewer note |
| ---- | ----- | ------------- |

## Reproduce

Copy-pastable, in order. Each line names what it should print.

```sh
cd ~/Developer/ablation-runs/<run-id>
git log --oneline scaffold..HEAD          # the run's own commits, scaffold excluded
npm ci && npm run verify                  # the gate as the run left it
node "$(node -p "require('./package.json').bin.mh")" --check --root fixtures/corpus
                                          # expect the frozen verdict, exit 1
bash <skill>/scripts/collect-metrics.sh .  # regenerates every number above
bash <repo>/docs/evals/ablation/held-out/run.sh .  # layer 1b, one row per edge
```

## Record channel

Which records the run opened, by which tool, and how far in. A governed run that never opened one
is the strongest result in the study and the easiest to miss, so it is recorded as a number.

| metric                       | value |
| ---------------------------- | ----- |
| records in the tree          |       |
| records ever opened          |       |
| via Read / via Bash          |       |
| first access, s into session |       |

## Shape

`bin.mh` → `<path the run declared>`. Whether it sits inside a Package is direct evidence on
`ARCH-004`, so read it first.

| metric                          | value |
| ------------------------------- | ----- |
| pure files                      |       |
| pure files with no sibling test |       |
| tests in a package suite        |       |
| tests as same-name siblings     |       |

## Reasoning

The run's own account is `RESULTS.md` at its repo root: what it built, what it decided against,
where the spec ran out. Link it; do not restate it. Add here only what the run could not know —
how its decisions read against the other variants.

## Anomalies

<stalls, permission denials, self-authored governance, network errors during dependency
installation, anything that makes this run not comparable to its siblings>
````

## Inspection-tour report

After all runs complete, the scoring ticket produces a guided walk through each run's codebase,
ordered by where the arms diverge most. The report shape:

1. **Entry-point placement** — where each arm put `bin.mh`, and whether it sits inside a Package.
2. **Per-record differential table** — record × arm × model, violations tabulated.
3. **Divergence tour** — for each area of divergence, the files side by side, with the relevant
   record's constraints quoted for context.
4. **Summary** — per record: did it bind, and did compliance correlate with better output, or a
   statement that n was too small to say.
