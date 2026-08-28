---
type: Not A Value Any Rule Allows
description: ''
---

<!-- expect: UNGOVERNED -->

Excluded by `excludeFiles` and matched by nothing after it. Both
faults here are real — the `type` value appears in no rule's `allowed` records,
and an empty `description` fails `presence: required` — and neither may ever be
reported. That is what this file tests.
