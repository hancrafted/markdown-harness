---
name: run-workflow-shell-locally
description: Parse a new GitHub Actions workflow, extract its run blocks, and execute them on /bin/bash 3.2 before committing — CI shell is otherwise unproven until the run that depends on it
metadata:
  type: feedback
---

A `run:` block in a workflow is untested code. Before committing a new workflow, parse the
YAML, write each `run:` block to a file, and execute it locally on `/bin/bash` — then break
one assertion and watch it fail.

**Why:** writing `smoke.yml` for #46 on 2026-09-07, this found a real defect on the first
attempt. `npm pack --pack-destination packed` **does not create the directory it is handed** —
npm 11.17 exits `ENOENT` naming the tarball it was about to write, which reads as a packing
failure rather than a missing directory. The workflow would have gone red on all three
platforms on its first run, and the message would have pointed at the wrong cause. The same
run also proved the assertion helper could fail rather than being vacuously green
([[vacuous-green]]), and showed that YAML block-scalar dedenting produced exactly the intended
heredoc — a thing worth seeing rather than assuming.

**How to apply:** parse with the repo's own `yaml` package rather than by hand
(`wf.jobs.<job>.steps.filter((s) => typeof s.run === 'string')`), write each block out, and
run `/bin/bash -n` on all of them before running any. Then simulate the workspace the runner
would have — symlink `node_modules`, copy the tracked files the steps touch — and run the
blocks in order from the right working directory, honouring each step's
`working-directory`. Use `/bin/bash` explicitly, not the login shell: macOS runners ship
**bash 3.2**, so anything needing bash 4 has to fail here rather than in CI
([[shell-degenerate-inputs]]).

Two things this cannot reach, and both belong in a comment on the workflow rather than in
a false sense of cover: the `.cmd` and `.ps1` shims npm generates on Windows, and anything
keyed to `process.platform` ([[glob-semantics-are-measured]]). A three-platform matrix is
the only instrument for those, which is the argument for having one.
