---
name: rtk-filtered-output-lies
description: RTK's diff filter reports "Files are identical" for files whose hashes differ, its ls appends size suffixes that break grep anchors, and its ls can report an existing directory as "No such file or directory" — hash, byte-count, or `rtk proxy` instead
metadata:
  type: feedback
---

Never trust RTK-proxied `diff` or `ls` output as evidence for a factual claim about file
contents, counts, or **existence**.

**Why:** auditing the ablation arms, `diff a/package.json b/package.json` printed
`[ok] Files are identical` for three files whose SHA-256s differed and whose sizes were
909 / 901 / 906 bytes. Separately, `ls .archgate/adrs/ | grep -c '\.rules\.ts$'` returned
**0** for five real files, because RTK appends a size suffix (`  2.9K`) to each line and
broke the `$` anchor; and `ls *.md | grep -v rules | wc -l` returned 9 for 10 records
because it ate `GEN-002-adr-symlink-claude-rules.md`. All three numbers were wrong in a
direction that looked plausible, which is what makes it dangerous.

The existence failure is the newest and the worst, because it inverts a boolean rather than
skewing a number: minting a run, `ls docs/evals/ablation/` returned
`ls: docs/evals/ablation/: No such file or directory` for a directory holding five entries —
in the same session where `ls docs/evals/ablation/implementation-spec.md` had already listed a
file _inside_ it. `rtk proxy ls -1` on the same path printed all five. A filtered `ls` that
says "absent" is not evidence of absence, and reading it as such would have looked exactly
like the phantom path in [[reproduce-measurement-before-calling-drift]].

**Omission is worse than either, because nothing looks wrong.** On 2026-09-04, `ls -la`
on the runs root printed four of six entries and dropped two whole run directories. I
built an entire analysis on "you have two completed runs", reported it, and only caught
it because an unrelated symlink resolved `VALID` against a target that "did not exist".
`rtk proxy ls -la` showed four runs, two of them complete and green — the headline I had
given Han was wrong in the denominator. A filtered listing is not an inventory.

**It corrupts file reads too, not just listings.** A reviewing subagent independently
reported that its `Read` of two of these scripts came back with `import`, `for` and `=`
dropped and prose mangled, and had to re-fetch byte-exact with `cat -n` before it could
trust line numbers. So the corruption reaches the content of files, not only the shape of
directory output, and a line number quoted from a filtered read may point at nothing.

**How to apply:** for content identity use `shasum -a 256` and `wc -c`, never `diff`. For
counts, list the files explicitly and count what is printed rather than grepping an anchored
pattern against filtered `ls`. For **existence or directory listings**, use `rtk proxy ls`
(or `test -e` / `find`) — a bare `ls` saying "No such file" needs a raw second opinion before
you report it or conclude drift. If a number or an absence is going into a ticket, a record,
or a claim to Han, reproduce it with a tool whose output you have inspected raw.

Same family as [[reproduce-measurement-before-calling-drift]] and
[[evaluate-arrays-never-grep-them]] — the cause differs each time, but the lesson is that
the count is lying before the reasoning is.
