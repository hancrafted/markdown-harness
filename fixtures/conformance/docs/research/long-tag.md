---
type: research
description: A note carrying a single tag longer than the rule allows.
tags: [retrieval-augmented-generation]
sources:
  - id: only
    resource: https://example.invalid/long-tag
---

<!-- expect: FAILS -->

One entry, so `minItems: 1` and `maxItems: 5` are both satisfied, and the entry is
thirty characters against `itemMaxLength: 20` — `ITEM_TOO_LONG`, addressed at
`tags[0]` so the report says which entry. `VALUE_TOO_LONG` would be the wrong code:
that belongs to `maxLength` on a string, and this string is an entry of a list, not
the field the rule names.
