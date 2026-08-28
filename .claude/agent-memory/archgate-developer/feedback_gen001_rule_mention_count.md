---
name: feedback-gen001-rule-mention-count
description: GEN-001's adr-rule-mentions rule wants exactly one Do's/Don'ts-side marker per companion rule, not one per relevant bullet
metadata:
  type: feedback
---

When authoring a new ADR's `### Do's` / `### Don'ts` lists, give each companion `.rules.ts` rule
exactly ONE `(Decision N, 📜 Rule: \`key\`)`marker on the Do's/Don'ts side — even if several
Do/Don't items are equally relevant to that rule. GEN-001's`adr-rule-mentions` check fails with
"needs its marker ... exactly once ... found N" if the same rule key is marked on more than one
bullet.

**Why:** GEN-001 §5.3 says "anchor every companion rule to prose twice" — twice total (one
Decision-side anchor marker, one Do's/Don'ts-side marker), not twice per side. `GEN-002-adr-symlink-claude-rules.md`
already demonstrates the pattern: only Do #1 carries the rule marker even though Don't #1 is
equally on-topic; every other related bullet cites just `(Decision N)` with no rule marker. This
was there to read before writing, not just something `archgate check` catches after the fact.

**How to apply:** When a single rule's Discipline spans several Do/Don't bullets (common — one
rule often covers "don't do zero", "don't do too many", "don't use the wrong value"), pick the
bullet that most directly names what the rule checks and put the `📜 Rule:` marker only there.
Leave the rest as plain `(Decision N)` references. Verify with `archgate check --base <ref
reaching the new ADR>` before assuming the marker count is right — see
[[feedback_adr_prose_compression]] for the sibling discipline of fitting ADR prose into a budget.
