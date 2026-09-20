---
type: research
description:
tags: [conformance]
sources:
  - id: only
    resource: https://example.invalid/blank-description
---

<!-- expect: FAILS -->

`description` is written with no value under `presence: required` and `maxLength: 200`.
The presence tier owns emptiness, so this reports `EMPTY_REQUIRED_FIELD` and nothing else.
A field written with no value is absent in substance and must not report
`CONSTRAINT_SHAPE_MISMATCH` against string constraints.
