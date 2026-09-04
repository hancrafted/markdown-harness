---
name: prepare-ablation-run
description: 'Mint run repositories under ~/Developer/ablation-runs, each stamped with a variant, the frozen spec, and the acceptance kit.'
disable-model-invocation: true
---

# Prepare a run

Mints one repository per run, because a run is a single interactive harness session, and each
repository is a snapshot rather than a link back here — spec and context frozen as they stood at
mint time.

## 1. Interview

Ask these questions.

1. **Which variants?** `bare`, `checks-only`, `governed`, or any combination.
2. **Which models?** Each answer becomes the last field of a run id, e.g. `sonnet-5`,
   `gemini-3.8-flash-high`.
3. **How many of each?** One repository is minted per variant × model × repeat, so two of each
   across three variants on one model is six repositories.
4. **Which spec/md file?** State default `docs/evals/ablation/implementation-spec.md`

### Summarize

1. Read the spec and **create a slug naming the task the run performs, no abbreviations** using this format `YYYYMMDD-<slug>-<variant>-<run-number>-<model>`, for example `20260904-build-initial-cli-bare-1-sonnet-5`
2. If multiple runs are to be created,

**Wait for user confirmation before proceeding**

## 2. Refuse a drifted kit

```sh
bash scripts/preflight.sh --spec <path>
```

This checks that this repository is clean at the declared source commit, and that the acceptance
kit still reproduces its frozen verdict — `governedFiles: 24`, `invalidFiles: 15`,
`totalViolations: 22`, all 18 codes reached.

A drifted kit silently changes the functional gate for **every** run minted from it, and runs
minted either side of the drift are then not comparable. A failure here is a **refusal**: report
exactly what drifted, and mint nothing.

## 3. Mint

One run:

```sh
bash scripts/prepare-run.sh --variant <variant> --model <model> --slug <slug> --spec <path>
```

A matrix:

```sh
bash scripts/prepare-batch.sh --slug <slug> --models <a,b> --variants <x,y,z> --repeat <n> --spec <path>
```

`prepare-run.sh` is the only script that writes; the batch delegates every cell to it, so a batched
and a hand mint produce identical repositories. The batch mints repeat-major, so an abort partway
leaves whole balanced blocks rather than every repeat of one variant and none of another. It
reports each cell as `ok` or `FAIL` and exits non-zero if any cell failed — read that table, since
a batch that minted five of six still prints five successes.

## 4. Check every mint

```sh
bash scripts/verify-run.sh <run-directory>
```

Report its output verbatim, including anything it flags. Run it on **each** repository a batch
produced. The checks that matter most are the ones whose failure is silent: that `.claude/rules/`
entries are real symlinks rather than the copies `rsync -aL` would leave, that no symlink resolves
outside the run directory, that the leak sweep covers the whole tree rather than one file, and that
every gate except the acceptance suite opens green — the suite is red by design until the run
builds the thing.

Do **not** expect a non-zero dependency count here. `src/` is empty at mint, so cruising zero is
correct and proves nothing either way; what is checkable now is that `tsPreCompilationDeps: true`
is set, without which the tool erases every `import type` and prints a green checkmark over an
empty graph. The non-zero assertion belongs to scoring, over an output tree.

## 5. Hand over

Print what `prepare-run.sh` reported: the launch command, the flags, and `start`. The flags are
protocol, not convenience — `--setting-sources project,local` shuts off the user-level hooks that
would otherwise rewrite `Read` into `cat` and hide the record channel from the transcript.

The variant is in the directory name by decision, so the operator reads the runs root at a glance.
What stays out of the name and out of the tree is the study around the run: that it is one of
several, and that anything is being compared.

## 6. After the session

```sh
bash scripts/collect-metrics.sh <run-directory>
```

Reports tokens, the record channel (which records the run opened, by which tool, and how far into
the session), skills invoked, test placement, and the floor. Claude Code's figures are recoverable
from its transcript at any later time and need no logging switched on. Antigravity's are not
recoverable at all, so an interactive Antigravity run reports the floor by design, not by failure.

This output is **operator-side**. Never write it back into the run: telling a run that its record
reads are being counted is the one measurement that would change what it measures.
