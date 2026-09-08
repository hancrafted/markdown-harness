---
name: fixture-bodies-are-the-contract
description: conformance fixture prose specifies required behaviour, so measure a predicate change against the corpus before adopting it — two reviewers agreed on a fix that would have broken a documented contract
metadata:
  type: feedback
---

Before changing a predicate that decides which violations fire, run the change
against `fixtures/conformance/` and read the prose of every fixture whose
verdict moves. The fixture body is the specification, not commentary —
`valid-test-config.yaml` says so outright: _"Changing an expected outcome is a
contract change, not a test fix."_

**Why:** finishing #40, two independent subagent reviewers (Standards and Spec)
each reproduced a real inconsistency and each recommended the same "minimal,
more correct fix" — replace the `null || undefined` guard in
`field-constraint.pure.ts` with the canonical `isEmptyValue()`. Their argument
was strong and cited a real invariant (`field-evidence.pure.ts`: "Emptiness has
ONE definition in this tool"). Applying it and running the corpus silenced
`docs/research/untagged.md`, whose body _states_ the contract it would have
broken: "`tags` is present but holds no entries, so `minItems: 1` reports
`TOO_FEW_ITEMS` … a count fault and not `EMPTY_REQUIRED_FIELD`." Corpus went
36/24/28 → 36/23/27 and `TOO_FEW_ITEMS` lost its fixture. Neither reviewer
checked the corpus; both were confident.

The resolution is a vocabulary distinction worth keeping: the tier model turns
on **absence**, not emptiness. `field-constraint.pure.ts`'s own header says "A
`minItems` fired on absence would quietly turn every size constraint into
`required`" — _absence_, i.e. a bare key parsing to `null`. `tags: []` is
**present with zero entries**, so the shape tier may speak. `isEmptyValue`
answers a different question — "did the author supply content?", which is what
`presence: required` needs — and is the wrong predicate for "may downstream
tiers speak?".

**How to apply:** agreement between two reviewers is one observation when both
reason from the same source file and neither runs the corpus — the same trap as
[[rtk-filtered-output-lies]]'s "two filtered commands agreeing is one
observation, not two". Measure with the edit applied, then revert and prove the
revert with a fresh-process read, not `git status`. Related:
[[reproduce-measurement-before-calling-drift]] and [[vacuous-green]].
