---
type: [research]
---
<!-- expect: PASSES -->

A `type` written as a one-item list is not a string, so it selects no `types` entry even though the list contains `research`. A membership test that coerces or searches the value would govern this file under `research-reports` and fail it.

# Research
