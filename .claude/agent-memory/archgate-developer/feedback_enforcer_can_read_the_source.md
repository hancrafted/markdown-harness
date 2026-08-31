---
name: feedback-enforcer-can-read-the-source
description: Before proposing any mechanical check, prove the enforcer can read the source of truth and that a planned component will not retire the check
metadata:
  type: feedback
---

Before proposing a deterministic check, answer two questions **with evidence**, in this order:

1. **What is the single source of truth for the thing being checked?** Not "which artifact feels
   authoritative" — which one everything else is or could be derived from. If the answer is "three
   hand-copied homes", the check to build is the one that binds them, not the one downstream.
2. **Can the enforcer you are proposing actually read that source?** Run a probe. Do not reason
   from the tool's docs.

**Why:** proposing an archgate rule over the config vocabulary looked obvious — `ctx.readYAML()`
exists, so the YAML is readable. But the vocabulary's SSOT is `src/config/contract.ts` and
`constraints.ts`, and a throwaway probe ADR calling `ctx.ast(file, 'typescript')` on them returned
`top=[] typeNodes=0`. **Archgate transpiles TypeScript before parsing, so type-only declarations
are erased** — interfaces and type aliases are invisible to every archgate rule, permanently. The
cheap gate was `tsc --noEmit` (already in `verify` and `verify:commit`), which reads the SSOT
natively and needs no new artifact.

**Third question, once the first two pass:** does a component already on the roadmap _retire_ this
check? `ARCH-002` §1.2 calls the conformance coverage half "scaffolding a future config-schema
validator replaces" — so a rule enforcing it is scaffolding with a known demolition date. Han's
call was to refuse it outright rather than defer it, and to record the refusal as a decision:
deferred-indefinitely work nobody killed is how a duty quietly stops being met.

**How to apply:** when the ask is "implement a rule for X", spend the first pass on probes, not on
the rule. Cite probe output (green _and_ red) in the proposal. Prefer the enforcer that can read
the SSOT over the one the user named. See [[feedback_gen001_rule_mention_count]] for the sibling
test on marker placement — same failure shape, one level down: a check that cannot see the file it
claims to govern.

**Type-level assertions:** `const _x: Missing[] = []` compiles **green** under a non-`never` type —
`[]` satisfies any element type. Use `type Reaches<T extends never> = T;` instead. Verified red
and green; see issue #16.
