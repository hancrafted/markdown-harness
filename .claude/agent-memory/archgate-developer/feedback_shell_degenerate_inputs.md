---
name: shell-degenerate-inputs
description: A shell script that syntax-checks and passes one happy-path run has been tested for nothing — exercise empty lists, metacharacters and the failure paths on /bin/bash 3.2, which is the only bash macOS ships
metadata:
  type: feedback
---

`bash -n` plus one successful run is not evidence a script works. Exercise the degenerate
inputs — empty string, empty list, metacharacter, missing file, mid-run failure — and do
it with `/bin/bash`, which on macOS is **3.2** and is the only bash on the box.

**Why:** on 2026-09-04 I shipped four defects into `prepare-ablation-run` that all
survived `bash -n` and a clean three-variant mint. A reviewer found every one:

- `--variants ""` produced an empty array, and expanding one under `set -u` on bash 3.2
  is an unbound-variable error — the batch died mid-flight instead of refusing up front.
  The neighbouring `${arr+"${arr[@]}"}` sites were fine, so the file looked consistent.
- An unvalidated `--model` reached a `sed` expression as a delimiter and silently
  neutered a whole check (see [[vacuous-green]] entry 8).
- `cleanup()`'s trap re-tested `[ -d "$RUN_DIR" ]` after the script had `cd`'d, so a
  relative `RUNS_ROOT` made it resolve nothing, find nothing, and leave a half-built run
  behind while reporting nothing.
- Embedded Python raised on a `null` timestamp and on a non-string one. The wrapper
  caught it, so the script exited 0 — but partial stdout had already flushed, so the
  report carried a real `### Tokens` table _and_ an "unreadable" notice underneath it.
  A crash that half-prints reads as data, not as failure. Buffer the whole report and
  print it only once the parse has finished.

Three of the four are invisible on the happy path by construction: they need an empty
input, a hostile character, or a failure to occur first.

**How to apply:** before claiming a shell change works, run a battery — every argument
empty, every list empty, one bad enum value, one metacharacter, and one forced mid-run
failure — and read the **exit code**, captured without a pipe, since `| tail` and
`| grep` both replace it with their own. Prefer refusing the whole batch up front over
half-completing it: a partly-minted matrix is the state hardest to reason about later.
Same family as [[vacuous-green]].
