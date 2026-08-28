---
name: feedback-gen001-rule-mention-count
description: GEN-001's adr-rule-mentions wants exactly one Do's/Don'ts-side marker per companion rule, and it must sit on the bullet the enforcer's glob actually backs
metadata:
  type: feedback
---

When authoring a new ADR's `### Do's` / `### Don'ts` lists, give each companion `.rules.ts` rule
exactly ONE `(Decision N, 📜 Rule: \`key\`)`marker on the Do's/Don'ts side — even if several
Do/Don't items are equally relevant to that rule. GEN-001's`adr-rule-mentions` check fails with
"needs its marker ... exactly once ... found N" if the same rule key is marked on more than one
bullet.

**Why:** GEN-001 §5.3 says "anchor every companion rule to prose twice" — twice total (one
Decision-side anchor marker, one Do's/Don'ts-side marker), not twice per side.

**How to apply:** When a single rule's Discipline spans several Do/Don't bullets, put the
`📜 Rule:` marker only on the bullet that restates what the rule MECHANICALLY CHECKS. Leave the
rest as plain `(Decision N)`. Verify with `archgate check --base <ref reaching the new ADR>`
before assuming the count is right. See [[feedback_adr_prose_compression]] for the sibling
discipline of fitting ADR prose into a budget.

## Placement: run the glob-intersection test, don't pattern-match a neighbour

Choosing the bullet by "which reads as most on-topic" is how the marker ends up claiming reach the
enforcer does not have. Falsifiability test, and it is cheap:

> Intersect the enforcer's `files:`/cruise glob with the files the marked sentence names.
> **Empty intersection ⇒ the marker is false.** Move it.

**Why:** this defect has landed twice, one commit apart, and `archgate check` passed clean both
times — GEN-001 §5.3 pairs marker NAMES, never rule bodies, so nothing mechanical can catch it.

1. `3c2d90f` — ARCH-003's Compliance cited `tests-through-entrypoints` for wrong-grain-import, but
   dependency-cruiser runs over `src/` alone, so the ADR-sibling-test class the record names by
   name was the one class that Discipline never reached.
2. GEN-003 — the marker sat on the Do bullet about editing `eslint.config.mjs`, while the rule's
   glob is `src/**/*`; that config lives at the repo root, outside it. Caught in review, moved to
   the Don't the rule genuinely enforces.

**Watch the Do/Don't asymmetry.** A **Do** usually states the compliant ALTERNATIVE (do it in the
config instead), which is by definition the thing the rule does NOT check — so a Do is the more
dangerous host for a marker. The **Don't** usually restates the banned construct, which is exactly
what the rule greps for. Not a law: GEN-002 legitimately carries its marker on Do #1. Treat
GEN-002 as one instance, never as the template — decide with the intersection test each time.
