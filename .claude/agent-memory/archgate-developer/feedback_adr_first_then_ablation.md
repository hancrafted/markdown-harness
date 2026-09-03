---
name: adr-first-then-ablation
description: ADRs here are written before their subjects exist and validated afterwards by an ablation test, so "this record governs zero files" is not evidence against it
metadata:
  type: feedback
---

A governance record in this repo is written **first** and validated **after**, by an **ablation
test**: write the ADR, have agents implement the spec _without_ it, then compare the output. So do
not demand pre-existing measurement or an on-disk subject before an ADR can be written, and never
treat _"this record governs zero files"_ as an indictment of the record. That is a **subject
absence**, not a failure.

**Why:** on 2026-09-03, resolving wayfinder ticket #17 (does the suffix vocabulary survive a briefing
route that never fires), I recommended per-classifier verdicts argued from what each classifier
currently enforces — `.types` load-bearing on two real files, `.pure` with an enforcement block and
zero subjects, so "keep the name, retire the claim". Han rejected the frame: `.pure` and `.impure`
"nevered fired, because no files govern yet", and the plan is to create the ADR first then ablate. He
then gave the general form — **all ADRs created in map #2 except `GEN-001` are subject to testing once
implementation starts** — so the vocabulary's bigger fate did not need deciding at all. `GEN-001` is
the lone exception because it is the one record already exercised by use, having governed the
authoring of the other eight. My framing had treated absence of live enforcement as evidence about a
record, when it is only evidence that implementation has not happened yet.

**How to apply:** any evaluation of an ADR here — grilling its merit, auditing whether it earns its
keep, deciding whether to write one whose subject does not exist. Argue from the Discipline's
substance, not from live enforcement counts. Where a record cannot state a mechanical check
truthfully yet, the compliant shape is a declared review duty plus a **Known reach gap** paragraph
(`ARCH-005` Decision 2 and `ARCH-006` Decision 4 are the precedent), not deferral of the whole
record. And a wayfinder ticket can legitimately resolve as **premature rather than open** — that is a
real decision, not a dodge, once it names the instrument and the trigger. See
[[audit-the-tree-not-the-ticket]] and [[evaluate-arrays-never-grep-them]].
