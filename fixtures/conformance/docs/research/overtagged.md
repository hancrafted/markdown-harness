---
type: research
description: A note filed under one more tag than the rule allows.
tags: [okf, provenance, survey, actors, formats, indexing]
sources:
  - id: only
    resource: https://example.invalid/overtagged
---

<!-- expect: FAILS -->

Six entries against `maxItems: 5`, so `TOO_MANY_ITEMS` fires. Every entry is inside
`itemMaxLength: 20`, which keeps this case to the one code: the count is wrong and
nothing else is.
