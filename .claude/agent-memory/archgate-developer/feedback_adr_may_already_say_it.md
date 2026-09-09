---
name: adr-may-already-say-it
description: Before proposing governance, read the target ADR's own Risks and Compliance sections — a stale AGENTS.md is not evidence the record is silent
metadata:
  type: feedback
---

A gap in `AGENTS.md` is not a gap in the ADRs. Check the record itself — including its **Risks** and
**Compliance and Enforcement** sections, not only `Decision` and the Do's/Don'ts — before proposing a
new rule.

**Why:** on 2026-09-09 the lessons-learned step nearly proposed adding to `GEN-001` that archgate's
briefing cap applies per section rather than only to `Decision`. `GEN-001` **already said it**, twice:
a Risks entry ("archgate's briefing budget caps `Decision` and `Do's and Don'ts` far below the
whole-file cap") and a Compliance paragraph naming it a "Second budget channel". The only stale text
was `AGENTS.md` trap 6, which named `Decision` alone. The right fix was the operating doc, not the
record — and a duplicate rule in `GEN-001` would have been governance drift inside the governance ADR.

**How to apply:** `archgate adr show <id> | grep -in "<term>"` over the whole record before drafting.
The briefings that `archgate review-context` returns are **`Decision` plus Do's and Don'ts only**, so
anything a record settles in Risks or Compliance is invisible to a briefing-driven read — which is
exactly how a duplicate gets proposed. Related: [[audit-tree-not-ticket]] and
[[reproduce-measurement-before-calling-drift]].
