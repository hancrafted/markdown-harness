---
name: spec-holds-behaviour-not-setup
description: Route each ablation decision to its artifact before proposing it — the frozen spec holds product behaviour only; run-environment and instrument decisions belong to the scaffold ticket
metadata:
  type: feedback
---

Sort a decision to its artifact **before** putting it to Han. The frozen implementation spec holds
**product behaviour** — command surface, config language, output contracts, what "done" means.
Anything about the run environment (which skills are installed, what the launch flags are, which
files each arm receives, how runs are harvested) is a **setup** decision and belongs to the
scaffold ticket, never to the spec.

**Why:** on 2026-09-03 I put the `tdd/SKILL.md` "respect ADRs" clause to Han inside a spec-review
round. He approved the substance and corrected the framing — _"ok, but that is a setup todo and not
part of the spec."_ The structural reason is that the spec is **copied verbatim into every arm**, so
by construction it cannot carry anything arm-specific or environment-specific; putting a setup
decision there is not just misfiled, it is unimplementable.

**How to apply:** when a grill round produces a decision, name the artifact that will hold it in
the same breath as the recommendation. If the answer is "the scaffold ticket", say so and don't
touch the spec. Related: [[docs-workshop-not-for-instruments]] routes _files_ to the right home;
this routes _decisions_.
