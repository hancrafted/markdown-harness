# Start here

When the operator says `start`, work through this file top to bottom.

## Build

`SPEC.md` in this directory specifies a command-line program. Build it.

If your harness loads skills, use `implement` — it delegates to `tdd` for the red → green loop and
to `code-review` before you finish. If it does not, follow the method in `SPEC.md` §7.

Work in vertical slices: one failing test, the smallest code that passes it, then the next.

## Gate

`npm run verify` is the gate. The build is done when it exits green and every acceptance criterion
in `SPEC.md` §6 holds.

Commit each slice as you go, so the history records how the build progressed rather than arriving
as one final dump.

## Report

Write `RESULTS.md` at this directory's root, in the four parts `SPEC.md` §8 describes. Write it as
you go — a report assembled at the end reconstructs decisions from the diff.

## Finish

Your last action, once `npm run verify` is green: commit everything still uncommitted, `RESULTS.md`
included. Then stop.

The final commit is what marks the build finished, so nothing may sit uncommitted behind it.
