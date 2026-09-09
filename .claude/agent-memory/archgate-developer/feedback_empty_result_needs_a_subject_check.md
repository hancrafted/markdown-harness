---
name: empty-result-needs-a-subject-check
description: An empty search result has two causes — a broken tool and a wrong subject — and multi-file awk reports cumulative NR, so a "line 336" in a 128-line file is your own arithmetic, not the tree's.
metadata:
  type: feedback
---

When a search comes back empty or impossible, ask which of THREE things is wrong before
reporting anything: the tool, the pattern, or **the file you pointed it at**.

**Why:** scoping #43 I needed spec §2's exit-code contract and grepped
`docs/okf/SPEC-v0.2.md` for `exit`. Nothing. `rtk proxy grep`, plain `grep`, `/usr/bin/grep`
and `awk` all returned nothing, and having [[rtk-filtered-output-lies]] loaded I read four
agreeing negatives as four instances of the same filtering bug and started working around
the tooling. The negatives were all TRUE. That file is the Open Knowledge Format spec; the
CLI spec was `docs/evals/ablation/implementation-spec.md`, deleted from the tree by
`a425162` and reachable only as `git cat-file -p ca0c2e0`. I had the wrong subject, and a
memory that trains suspicion of negatives made the wrong subject harder to see, not easier.

The control search that note already prescribes resolves it in one call, and resolves it in
BOTH directions: grep the same file for a term you are certain it contains. A hit proves
the tool works and the subject is wrong; a miss proves the tool is lying.

**Multi-file `awk` reports `NR`, not `FNR`.** Same session, hunting test coverage:
`awk '/chmod|EACCES/ {print FILENAME": "NR": "$0}' $(find src -name '*.test.ts')` reported
a hit at `check.test.ts: 336`. That file is 128 lines long. `NR` counts records across the
whole input stream, so every filename after the first carries a line number offset by the
sum of its predecessors. The output looks exactly like a correct citation — right filename,
plausible number — and I only caught it because 336 > 128 was absurd on its face. With a
larger file it would not have been.

**How to apply:** use `FNR` whenever `awk` is given more than one file, and sanity-check any
cited line number against `wc -l` on that file before quoting it. When a search is empty and
the premise says it should not be, run the control search before concluding anything about
either the tool or the tree — and when the control passes, suspect the subject. Same family
as [[reproduce-measurement-before-calling-drift]] and [[evaluate-arrays-never-grep-them]]:
the reading is wrong before the reasoning starts.
