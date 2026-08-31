---
name: reproduce-measurement-before-calling-drift
description: Before reporting a recorded number as stale, reproduce the measurement method that produced it — a tool mismatch looks exactly like drift
metadata:
  type: feedback
---

When a record (map, ticket, ADR) states a number and the tree seems to disagree, **reproduce the
original measurement method before calling it drift**. Two numbers differing is not evidence of
staleness until you have ruled out measuring differently.

**Why:** on 2026-08-31, auditing #5, I read four ADR sizes with `wc -c` and reported all four as
drifted (11,782→11,852 etc.), twice, confidently, in a table. Every map figure was exact:
`AGENTS.md:59` documents that the ADR budget counts **characters, not bytes** and that `wc -c`
overstates by two per em dash. I had to retract publicly. In the same audit I also reported
`archgate check` moving 15/15→16/16 as drift; the total is purely a function of `--base`
(`6e30962`→16, `18186c0`→15, `b1915be`→13), so that was wrong too. Both errors shared one shape:
I compared my fresh measurement against a recorded one without checking we measured the same way.

**How to apply:** any "the record says X, the tree says Y" claim. First ask what produced X. For ADR
size use `wc -m` or trust `archgate check`'s own figure over the shell's. For any
changed-files-scoped tool, a count is meaningless without its base — quote the base alongside it or
don't quote the number. Only after the methods match is a delta drift. A false drift report is worse
than none: it sends the reader to fix a record that was already right, and it burns the credibility
of the real findings sitting next to it — here, the genuine ones (an unticketed ADR invisible to the
map, a decision applied at one site out of six, an ADR clause under-reaching its own rationale) were
the ones at risk of being discounted. Related: [[audit-the-tree-not-the-ticket]] for the surrounding
workflow, and [[measure-before-keeping-a-constraint]].
