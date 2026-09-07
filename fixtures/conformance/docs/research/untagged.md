---
type: research
description: A note whose tag list was emptied rather than removed.
tags: []
sources:
  - id: only
    resource: https://example.invalid/untagged
---

<!-- expect: FAILS -->

`tags` is present and holds no entries, so `minItems: 1` reports `TOO_FEW_ITEMS`. The
research rule places no `presence` beside the count bounds, so this is a count fault
and not `EMPTY_REQUIRED_FIELD`.
