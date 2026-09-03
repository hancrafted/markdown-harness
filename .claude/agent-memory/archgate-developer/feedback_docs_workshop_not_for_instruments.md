---
name: docs-workshop-not-for-instruments
description: docs/workshop/ is source material for Han's AI workshops — never proactively place instruments, evals, probes, or reports there; evals live in docs/evals/
metadata:
  type: feedback
---

`docs/workshop/**` exists so Han can **extract source material for his AI workshops**. Do not
proactively put anything there — no instruments, no eval records, no probe reports, no methodology
docs. The home for evaluation work is `docs/evals/`.

**Why:** on 2026-09-03, speccing the ADR ablation test, I twice recommended
`docs/workshop/probe/adr-ablation/` because map #2's fog item 6 names it as the ablation's home,
"following the routing probe's precedent". Han corrected: the workshop folder is only for workshop
material, and chose `docs/evals/`. The existing `docs/workshop/probe/` and `docs/workshop/dogfood/`
artifacts are grandfathered — their precedent does not generalize.

**How to apply:** whenever placing a new report, instrument, or doc. When a map, ticket, or
design-ADR names a `docs/workshop/` home for something new, flag it for amendment instead of
following it — map #2 fog item 6 carries exactly this stale pointer and the ablation epic owes the
amendment. See [[audit-the-tree-not-the-ticket]].
