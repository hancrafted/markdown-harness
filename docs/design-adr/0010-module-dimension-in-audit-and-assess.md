---
type: design-adr
status: accepted
---

# Audit and Assessment preserve Module-local meaning before Core composes them

Rule identity, rule order, assessment state and an Operator's assessment instruction are all
Module-local. The audit and assess responses therefore use the same `modules:` boundary already
used by checking and steering, ordered by the declared Module set and named by each descriptor's
top-level config key. Core does not concatenate rule tables or choose one Module's assessment over
another.

An audit includes every declared Module, including `{ module, rules: [] }` when that Module has no
rules or no section. The empty named block distinguishes a Module that was asked and declared
nothing from one that was never composed, and admits Modules whose governance is not rule-based
without inventing a rule identity for them.

A Module assessment returns one governed answer or passes the path by. It never returns
`ungoverned`: only `cli`, after every declared Module has passed the path by, can make that
whole-config claim. When multiple Modules answer, each keeps its own `state`, `agentAction`,
evidence, rule and optional Operator instruction in its Module block; there is no cross-Module
precedence rule and no aggregate action.

The prompt source value for the Module-wide block is `"module-wide"`, not `"module"`. The response
already uses `module` for the Module identity, so retaining the old value would make one word mean
both the top-level config section and a location inside that section. These response changes are
intentional portable-contract changes; Conformance expectations move with them rather than treating
the old wire shape as an implementation detail.
