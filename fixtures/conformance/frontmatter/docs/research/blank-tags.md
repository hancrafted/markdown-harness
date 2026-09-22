---
type: research
description: A research note whose optional tags list was written with no value.
tags:
sources:
  - id: only
    resource: https://example.invalid/blank-tags
---

<!-- expect: PASSES -->

`tags` is written with no value under list constraints (`minItems: 1`, `maxItems: 5`,
`itemMaxLength: 20`). The field is optional, so writing it empty reports no violation.
The collision tier does not speak about a value that is absent in substance, and emptiness
is not a shape collision.
