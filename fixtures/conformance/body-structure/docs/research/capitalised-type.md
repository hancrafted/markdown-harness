---
type: Research
---
<!-- expect: PASSES -->

`type` compares case-sensitively, so `Research` is not `research`. The file falls through to `research-untyped`; had it matched `research-reports` it would fail.

# Research
