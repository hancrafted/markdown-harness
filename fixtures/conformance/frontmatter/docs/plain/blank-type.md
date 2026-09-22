---
type:
title: Written and blank
---

<!-- expect: FAILS -->

`type` is written and holds nothing, so the plain rule's `presence: required` reports
`EMPTY_REQUIRED_FIELD` rather than `MISSING_REQUIRED_FIELD`. The key is there and the
value is not, and the two have different fixes.
