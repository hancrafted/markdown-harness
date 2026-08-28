---
type: research
description: Research carrying too many tags, one of them far too long.
generated:
  by: claude-opus/5
  at: 2026-08-25T09:00:00Z
tags:
  - okf
  - provenance
  - frontmatter
  - governance
  - steering
  - a-tag-far-longer-than-twenty-characters
---

FAILS twice on one field, which is the point of reporting every value constraint
rather than the first: six entries breaks `maxItems: 5` and the last entry breaks
`itemMaxLength: 20`, and an agent given one pass to repair the file needs both.
The `itemMaxLength` violation is addressed `tags[5]` — the only constraint in the
language that reports per entry.
