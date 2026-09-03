---
name: prepare-ablation-run
description: 'Mint one run repository under ~/Developer/ablation-runs, stamped with a variant, the frozen spec, and the acceptance kit.'
disable-model-invocation: true
---

# Prepare a run

Mints **one** run repository. One repository per run, because a run is a single interactive harness
session, and each repository is a snapshot rather than a link back here — the spec and context are
frozen as they stood at mint time.

Run this skill once per run. To prepare three runs, invoke it three times.

## 1. Interview

Ask these two questions, then stop asking.

1. **Which variant?** `bare`, `checks-only`, or `governed`.
2. **Which model will run it?** The answer becomes the last field of the run id, e.g. `sonnet-5`,
   `gemini-3.8-flash-high`.

Then **state, rather than ask**, the spec path you will stamp:
`docs/evals/ablation/implementation-spec.md`. It has one canonical answer, so confirm it and move
on; take an override if the operator offers one.

Everything else is derived: the date, the `mh` slug, and the next free run number for that
date.

## 2. Refuse a drifted kit

```sh
bash scripts/preflight.sh --spec <path>
```

This checks two things: that this repository is clean at the declared source commit, and that the
acceptance kit still reproduces its frozen verdict — `governedFiles: 24`, `invalidFiles: 15`,
`totalViolations: 22`, all 18 codes reached.

A drifted kit silently changes the functional gate for **every** run minted from it, and runs minted
before and after the drift are then not comparable. A failure here is a **refusal**: report exactly
what drifted, and mint nothing.

## 3. Mint

```sh
bash scripts/prepare-run.sh --variant <variant> --model <model> --spec <path>
```

This is the only script that writes. It prints the run directory and the launch line.

## 4. Check the mint

```sh
bash scripts/verify-run.sh <run-directory>
```

Report its output verbatim, including anything it flags. The checks that matter most are the ones
whose failure is silent: that `.claude/rules/` entries are real symlinks rather than the copies
`rsync -aL` would leave, that no symlink resolves outside the run directory, that the leak sweep
covers the whole tree rather than one file, and that every gate except the acceptance suite opens
green — the suite is red by design until the run builds the thing.

Do **not** expect a non-zero dependency count here. `src/` is empty at mint, so cruising zero is
correct and proves nothing either way; what is checkable now is that `tsPreCompilationDeps: true`
is set, without which the tool erases every `import type` and prints a green checkmark over an
empty graph. The non-zero assertion belongs to scoring, over an output tree.

## 5. Hand over

Tell the operator the directory and this, and nothing about what is being measured:

> Open a harness session in `<directory>` and type `start`.

The variant is **not** in the run directory's name, because the harness stamps the working directory
into the agent's context every turn. It is in the sidecar beside the run and in `by-variant/`, both
outside any run tree. Report those two paths to the operator, never into the run.

## 6. After the session

```sh
bash scripts/collect-metrics.sh <run-directory>
```

Claude Code's figures are recoverable from its transcript at any later time. Antigravity's are not
recoverable at all, so an interactive Antigravity run reports the floor by design, not by failure.
