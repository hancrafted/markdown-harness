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

9. On 2026-09-07, finishing #32, two shapes of `archgate check` reporting on nothing.
   `AGENTS.md` trap 1 already says `total: 0` means _nothing in scope changed_, but not
   the two ways to land there by accident. First: **a directory or a glob argument always
   yields `total: 0`.** `archgate check src/packages/markdown-file-tree` and
   `archgate check 'src/packages/markdown-file-tree/**/*'` both returned 0 while a single
   concrete file path returned 1 — explicit arguments are intersected with the changed set
   and only real file paths are in it. Second: **untracked files are outside the changed set
   entirely.** A brand-new Package scored 0 until `git add`, so the governance covering the
   only files I had written was measuring nothing. Both read as "governance passed".
   The fix was a canary rather than an argument: planting one `eslint-disable` in the new
   Package took the run to 14 passed / 1 failed, which is the only thing that proved GEN-003
   reaches it.

**The remedy generalises: give a silent check a canary it runs on itself.** Before the
sweep loop, it now feeds itself two synthetic lines and refuses if either misbehaves —
one planted forbidden word that it must still catch, one bare run id that it must still
suppress. Two-sided, because a strip has two ways to be wrong. A one-sided canary that
only proves "it can still fire" would have passed while the strip did nothing at all.
This beats "break it once by hand" because it re-proves itself on every run, against the
actual input in hand, rather than against the input I happened to imagine.

10. **A per-file `vitest run` is green about behaviour and silent about types.** Vitest
    transforms with esbuild, which strips types without reading them. Five units in a row
    went green that way during #33, and `tsc --noEmit` then produced 21 errors across
    those same five files — including an `as` cast that had widened a discriminated
    union's key to an index signature, which no test could catch because both shapes hold
    identical data at run time. Run the typecheck beside the test, not after the batch.
    Recorded as trap 8 in `AGENTS.md`.

11. **`archgate review-context` (0.13.2) returns no briefing text at all.** Each ADR object
    carries only `id`, `title`, `domain`, `files`, `rules` — with `truncatedBriefings: []`
    and `truncatedFiles: false`, so nothing announces the absence. The `archgate:reviewer`
    skill's Step 2 instructs pasting each ADR's Decision and Do's-and-Don'ts into the
    sub-agent prompt; against this output that paste is empty, and a sub-agent asked to
    verify against nothing returns a confident PASS. Point sub-agents at the
    `.archgate/adrs/*.md` files to read directly, and never trust a domain PASS whose
    prompt you did not confirm carried real rules.

12. **Item 11 reproduced on 2026-09-07 (archgate 0.55.0), and it has a fix.** Plain
    `review-context --run-checks` returned `decision` and `dosAndDonts` of **0 characters**
    for all seven in-scope ADRs. `CONTEXT.md`'s own **Briefing** entry says why: there is "no
    prose at all without `--verbose`". With `--verbose` all seven came back non-empty, and all
    seven sat under the 2,000-character cap (largest: ARCH-003 at 1,997), so nothing was
    truncated either. So the reviewer skill is usable — but only with `--verbose`, and only
    after checking the lengths. I still pointed the sub-agents at `.archgate/adrs/*.md` to read
    in full, which is what `CONTEXT.md` says is how an ADR actually reaches an agent.

**How to apply:** after writing any check, break the thing it guards and watch it fail.
The preflight bug cost nothing only because a dirty tree happened to arrive while I was
still looking. Specifically: never chain `&& echo ok` off a pipeline — capture the exit
status of the command you care about, or use `PIPESTATUS`. Never pipe a command into a
hasher with stderr suppressed. Treat `e3b0c442…b855` (SHA-256) and `d41d8cd9…e427` (MD5)
as sentinels for _my command produced no output_. And when a check asserts a count, ask
what the count is at the moment the check runs — an assertion that can only be satisfied
later is not a weaker check, it is a broken one. Related:
[[reproduce-measurement-before-calling-drift]] and [[rtk-filtered-output-lies]].

13. **A compile-time shadow is a check, and it can be vacuous too.** On 2026-09-08, working #42, I
    bound five validator key vocabularies to the contract types they claim to cover, rewriting
    `readonly string[]` as `Record<keyof T, true>` so that a type gaining a key stops compiling.
    `tsc --noEmit` was green — which proves nothing, because a green shadow and an inert one look
    identical, and `Record<string, true>` (had the `keyof` resolved to `string`) would have accepted
    literally any set of keys while reading correctly at a glance. The probe is two-sided and cheap:
    **delete one key from each record and expect `TS2741` (missing property); add a bogus key and
    expect `TS2353` (object literal may only specify known properties).** All five sites produced
    both, naming the exact record. The same probe shape caught a real bug in #41 — widening `Format`
    with a test member made `tsc` fail at _one_ site when it should have failed at two, exposing an
    `if`-chain in `value-format.pure.ts` that silently absorbed any new format into its last branch.

**How to apply:** treat "the type system will catch this" as a claim needing the same canary as any
runtime guard. Before writing a docblock promising that some future edit "will not compile", make
that edit and watch it not compile. A `keyof` that quietly resolves to `string` — via an index
signature, an `any`, or a type alias to `Record<string, unknown>` — turns the whole construction into
decoration, and nothing anywhere reports it.
