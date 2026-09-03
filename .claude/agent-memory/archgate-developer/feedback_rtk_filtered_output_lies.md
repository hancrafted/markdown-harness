---
name: rtk-filtered-output-lies
description: RTK's diff filter reports "Files are identical" for files whose hashes differ, and its ls appends size suffixes that break grep anchors — hash or byte-count instead
metadata:
  type: feedback
---

Never trust RTK-proxied `diff` or `ls` output as evidence for a factual claim about file
contents or counts.

**Why:** auditing the ablation arms, `diff a/package.json b/package.json` printed
`[ok] Files are identical` for three files whose SHA-256s differed and whose sizes were
909 / 901 / 906 bytes. Separately, `ls .archgate/adrs/ | grep -c '\.rules\.ts$'` returned
**0** for five real files, because RTK appends a size suffix (`  2.9K`) to each line and
broke the `$` anchor; and `ls *.md | grep -v rules | wc -l` returned 9 for 10 records
because it ate `GEN-002-adr-symlink-claude-rules.md`. All three numbers were wrong in a
direction that looked plausible, which is what makes it dangerous.

**How to apply:** for content identity use `shasum -a 256` and `wc -c`, never `diff`. For
counts, list the files explicitly and count what is printed rather than grepping an anchored
pattern against filtered `ls`. If a number is going into a ticket, a record, or a claim to
Han, reproduce it with a tool whose output you have inspected raw.

Same family as [[reproduce-measurement-before-calling-drift]] and
[[evaluate-arrays-never-grep-them]] — the cause differs each time, but the lesson is that
the count is lying before the reasoning is.
