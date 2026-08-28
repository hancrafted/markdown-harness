---
name: over-budget-adr-hand-over-complete
description: When compressing an ADR to its character budget would gut required sections, hand Han the complete record with per-section numbers and let him cut — do not choose the cut yourself
metadata:
  type: feedback
---

Compression is still the first move (see [[adr-prose-compression-not-relocation]]). But when
compressing far enough to fit would start deleting **required sections' substance** — rejected
alternatives, honest negatives, recorded enforcement limits — stop compressing. Write the record
complete, report the exact overage and a **per-section character table**, and let Han cut.

**Why:** On issue #13 (2026-08-28) the Testing ADR needed both the behavioural and structural
regimes. Measured: 18,592 characters complete; 13,897 after reducing every section to one-line
imperatives; ~11,770 only by stripping Context, Consequences, Compliance and References by a
further 25% — which would have cost two rejected alternatives, four Consequences items and a
Compliance limit. Offered the choice between that, a glob-split into a second ADR, dropping
content outright, and raising the cap, Han picked none: _"ignore the cap and write out all you
need. let me review and cut manually."_ He wants the complete artifact and reserves the editorial
judgement. Note this outranks `GEN-001` §4.2's own remedy ("split Disciplines by glob before
trimming one below usefulness") — the contract's instruction did not win the decision.

**How to apply:** Price the compression first and show the arithmetic, because the numbers are
what make the decision his rather than yours. Then leave `archgate check` red on
`adr-size-budget` alone — it is the correct signal, not a thing to work around — and **hold the
commit**, since husky's `verify:commit` runs `archgate check` and would refuse it anyway. Measure
in characters, never `wc -c` bytes: em dashes cost 3 bytes each and this repo's prose is full of
them. Surface the briefing-section warnings too, which move independently of the whole-file cap.
