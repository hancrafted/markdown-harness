---
type: research
description: Research with an empty tag list.
generated:
  by: claude-opus/5
  at: 2026-08-25T09:00:00Z
tags: []
---

FAILS `minItems: 1` on `tags`. The list is PRESENT and empty, so the presence
gate says nothing — `tags` has no `presence` key — and the size constraint the
Operator did write is the one that speaks. An ABSENT `tags` would report nothing
at all: `presence` is the only key that may make a field mandatory, and a
`minItems` that fired on absence would quietly turn every size constraint into
`required`.
