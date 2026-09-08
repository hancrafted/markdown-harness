---
name: strict-not-adopted
description: Operator ruled against archgate check --strict on 2026-09-08; GEN-001's own Context line contradicts this and is the trap
metadata:
  type: project
---

`archgate check --strict` is **not adopted**, and `#2`'s governance map is closed (2026-09-08). `verify`
and `verify:commit` run bare `archgate check`. Do not propose wiring `--strict` in again.

**Why:** by the time the choice came up it bought nothing. The compression work took all four
over-cap `Decision` briefings under 2,000, so at `a5db821` `--strict` already exited 0 with
`briefingWarnings`, `unparsedAdrs` and `suppressionWarnings` all empty. It would have gated a clean
channel — a tripwire, not a fix — and the Operator judged that not worth a standing pipeline
commitment. The order-of-preference argument in design-ADR `0002` (native config outranks an
authored rule) still stands; it just no longer obliges adoption.

**How to apply:** three artefacts in the tree still say otherwise, and the first is the dangerous one
because it reads as governance.

1. `GEN-001-adr.md` **line 18** — "`archgate check --strict` gates it at commit and push." False,
   and **line 103 of the same record** says "not adopted here". The record contradicts itself. Believe
   `package.json`, not either line. Fixing it is an `archgate:adr-author` edit, still unmade.
2. `.github/workflows/ci.yml` ~54–57 — a comment calling `--strict` "already decided and pending",
   linking closed `#27`.
3. `AGENTS.md` trap 6 — says `#28` "is still **open**". It is closed.

Because nothing gates the cap now, the margins are held by attention alone: `ARCH-003` clears by
**2** characters, `ARCH-004` by **73**. One added `Decision` sentence in either reopens the warning
silently. See [[feedback_adr_prose_compression]] and [[feedback_over_budget_adr_hand_over]] for what
to do when a record will not fit, and [[feedback_audit_tree_not_ticket]] for why the three stale
pointers above must never be read as state.
