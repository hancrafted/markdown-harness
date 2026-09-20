---
type: reference
---

<!-- expect: PASSES -->

The plain rule's whole payload is `type: { presence: required }`, and
this file has a `type`. Note the value: `reference` is outside this rule's
vocabulary because the rule declares none — presence and membership are separate
opt-ins, and asking for one never implies the other.
