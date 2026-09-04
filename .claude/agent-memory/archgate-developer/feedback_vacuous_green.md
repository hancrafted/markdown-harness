---
name: vacuous-green
description: A check that reports success without having checked anything is the default failure mode here — prove the check can fail before trusting it passing
metadata:
  type: feedback
---

Before trusting a check that passed, prove it is capable of failing. A green that
never ran is indistinguishable from a green that ran and passed, and this repository
produces them constantly.

**Why:** on 2026-09-03, building `prepare-ablation-run`, five separate vacuous greens
appeared in one session:

1. `eval "$(preflight.sh)"` — preflight printed `REFUSED:` in full, exited 1, and the
   mint proceeded anyway. The substitution captures stdout, the refusal goes to stderr,
   and `eval` on an empty string succeeds, so `set -e` sees nothing. The guard was
   decorative for its whole life and only surfaced on the first dirty tree.
2. `npx eslint … | tail -5 && echo "CLEAN"` — eslint died with `ERR_MODULE_NOT_FOUND`
   and `CLEAN` printed, because `&&` chained off `tail`'s exit status, not eslint's.
3. `git show <ref>:<path> 2>/dev/null | shasum` — the ref was wrong, output was empty,
   and the hash returned `e3b0c442…b855`, the SHA-256 of nothing, which reads as a
   real answer.
4. `verify-run` asserting a non-zero dependency count and a non-zero archgate total on
   a _fresh_ mint, where `src/` is empty and nothing has changed since the scaffold
   commit. Both would have been vacuous by construction.
5. The two already written into `AGENTS.md`: `archgate check` `total: 0` means nothing
   was in scope, and `dependency-cruiser` prints its checkmark over an empty graph.
6. `verify-run.sh` printed **"all checks passed"** on a mint whose own `npm run verify`
   was red on two files. It checked symlinks, sweeps and config flags — everything
   except the gate the artifact is actually graded by. A verifier that does not run the
   subject's own gate certifies its own opinion, not the subject.
7. Same session, the inverse shape: a leak sweep scoped to `AGENTS.md` alone reported
   CLEAN while `PROVENANCE` failed the identical pattern on three lines. Widening it to
   the tree immediately found a real leak in `governed/vitest.config.ts` — a comment
   explaining the experiment to its subject. A sweep's scope is part of its claim.

8. On 2026-09-04 the same skill produced the worst one yet, and I wrote it myself. A
   leak sweep interpolated the run id into `sed "s|$RUN_ID||g" "$f" 2>/dev/null | grep -qiE`.
   A run id holding a regex metacharacter — a `|` closing the `s///` command, a `.`
   matching any character — made `sed` exit 1, handed `grep` an empty stream, and
   printed `ok tree sweep clean` over a tree it never read. `gemini-3.8-flash` also
   silently stripped `gemini-3X8-flash`. It passed every happy-path test I ran, because
   every id I tested with was well-formed.

**The remedy generalises: give a silent check a canary it runs on itself.** Before the
sweep loop, it now feeds itself two synthetic lines and refuses if either misbehaves —
one planted forbidden word that it must still catch, one bare run id that it must still
suppress. Two-sided, because a strip has two ways to be wrong. A one-sided canary that
only proves "it can still fire" would have passed while the strip did nothing at all.
This beats "break it once by hand" because it re-proves itself on every run, against the
actual input in hand, rather than against the input I happened to imagine.

**How to apply:** after writing any check, break the thing it guards and watch it fail.
The preflight bug cost nothing only because a dirty tree happened to arrive while I was
still looking. Specifically: never chain `&& echo ok` off a pipeline — capture the exit
status of the command you care about, or use `PIPESTATUS`. Never pipe a command into a
hasher with stderr suppressed. Treat `e3b0c442…b855` (SHA-256) and `d41d8cd9…e427` (MD5)
as sentinels for _my command produced no output_. And when a check asserts a count, ask
what the count is at the moment the check runs — an assertion that can only be satisfied
later is not a weaker check, it is a broken one. Related:
[[reproduce-measurement-before-calling-drift]] and [[rtk-filtered-output-lies]].
