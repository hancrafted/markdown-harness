---
type: Not A Value Any Rule Allows
description: ''
---

<!-- expect: UNGOVERNED -->
<!-- assess: PROCEED -->

Excluded by `excludeFiles` and matched by nothing after it. Both
faults here are real — the `type` value appears in no rule's `allowed` records,
and an empty `description` fails `presence: required` — and neither may ever be
reported. That is what this file tests.

The second marker extends the same claim to `--assess`. A file no rule selects
gets `PROCEED` and nothing else: no rule, no evidence, no sentence. Silence
about an unclaimed file is the contract, because a governance tool that comments
on everything is one an Operator switches off.
