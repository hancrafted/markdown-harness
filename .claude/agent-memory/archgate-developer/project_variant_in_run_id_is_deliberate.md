---
name: variant-in-run-id-is-deliberate
description: Ablation run directories name their variant on purpose — Han traded blinding for operator ergonomics with the cost stated; do not "fix" it back to an opaque id
metadata:
  type: project
---

Ablation run directories are `YYYYMMDD-<slug>-<variant>-<n>-<model>`, e.g.
`20260904-build-initial-cli-governed-1-sonnet-5`. The variant is in the name **on
purpose**.

**Why:** on 2026-09-04 I put the case against it — the host harness stamps the working
directory into the agent's context every turn, so a governed run can read the word
"governed" about itself, and `bare` invites an agent to wonder what it is missing. I
offered an opaque id plus a sidecar, and a per-variant codename as the blinded-trial
middle ground, and recommended the codename. Han chose the plain variant name anyway:
he reads the runs root at a glance, and that ergonomic beats a blind he judged already
thin. The `by-variant/` symlink index was deleted in the same move, since the names now
sort.

What is still withheld is the study _around_ the run: no `ablation`, no sibling variant,
no hint that anything is being compared. `prepare-run.sh` rejects a slug carrying any of
those words, `spec_path` stays in the operator-side sidecar because it names
`docs/evals/ablation/...`, and `verify-run.sh` sweeps the whole tree for the vocabulary.

**How to apply:** do not propose re-blinding the directory name, and do not treat
`governed` appearing in a run's cwd as a leak to fix — it is a priced decision, not an
oversight. Do keep refusing anything that tells a run it is one of several. If the study's
findings later look confounded by the name, that is a real finding to raise with evidence,
not a reason to quietly change the scheme mid-study.
