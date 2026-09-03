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

**The record lags the tree here — three times now.** A phase is not done when `verify` goes green; it
is done when the ticket is closed and the map is amended. If you land the commit, close the ticket in
the same session. Recurrence on 2026-09-02 (#7, phase 5): the build work was green and correct, but
the red state was unrecorded on the ticket, the probe result was missing from the design-ADR it was
commissioned to settle, and the required count went unreported. **The gaps cluster in the criteria
that ask you to _write something down_, never in the ones that ask you to make code work** — so audit
those first and expect them to be the open ones.

**Read the ticket body before attacking its premises.** Auditing _state_ against the tree is right;
critiquing _reasoning_ from a summary is not. On 2026-09-03 I grilled #17 from the map's one-line
frontier entry and presented as a finding something the ticket body already said outright — the trap
that the harness's own instructions tell agents to prefer `cat`/`sed`/`grep` over Read, which is what
starved the briefing channel. Two of my other three corrections did hold against the ticket's text,
so the round was not wasted, but crediting yourself with the author's own point costs standing you
need for the corrections that are real. Fetch the body first; then the tree.
