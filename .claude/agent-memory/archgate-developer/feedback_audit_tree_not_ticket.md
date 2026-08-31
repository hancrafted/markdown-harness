---
name: audit-the-tree-not-the-ticket
description: When asked whether a ticket or phase is done, audit the working tree against its acceptance criteria rather than reading issue state
metadata:
  type: feedback
---

When Han asks _"is #N done?"_, do not answer from `gh issue view`. Walk the ticket's acceptance
criteria one at a time and cite the artefact that satisfies each — file and line, commit hash,
command output. Then say separately whether the **ticket** is closed. The two answers are often
different, and which one differs is the useful part.

**Why:** on 2026-08-31 he asked whether #5 was done, noting #13 was still open. Issue state said
neither had landed. The tree said otherwise: all twelve of #13's criteria were satisfied by
`b1915be` and `3dea5ad`, three days earlier, with `verify` green and `archgate check --base HEAD~6`
at 15/15. Nothing was left to build. The audit also turned up the one genuine gap — a later commit
had introduced an ADR section coordinate the ticket's last criterion forbade — which reading the
issue would never have found. He accepted the audit and answered the single question it raised
("Q1: ok") without disputing the approach.

**How to apply:** any "is X done / where did we get to / what's left" question about a wayfinder
ticket, phase, or map. Budget the tool calls for it: read the ticket body, then verify each
criterion against the tree. Run `npm run verify` yourself rather than trusting a green from a past
session, and remember bare `archgate check` reports `total: 0` when nothing in scope changed. Report
unsatisfied criteria plainly instead of ticking them in spirit — a box ticked on a technicality is
the thing this audit exists to catch. Related: [[orient-before-grilling]] for how to frame the
answer, and [[feedback-enforcer-can-read-the-source]] for probing rather than reasoning from docs.

**The record lags the tree here.** A phase is not done when `verify` goes green; it is done when the
ticket is closed and the map is amended. If you land the commit, close the ticket in the same
session.
