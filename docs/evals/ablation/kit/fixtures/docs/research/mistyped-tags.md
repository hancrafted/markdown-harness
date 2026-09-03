---
type: research
description: Research whose tags are a sentence rather than a list.
generated:
  by: claude-opus/5
  at: 2026-08-25T09:00:00Z
tags: okf, provenance, frontmatter
---

FAILS as the OPERATOR's mistake, not the author's, and it is the one file in the
corpus that does. `tags` carries `minItems`, `maxItems` and `itemMaxLength` — all
three name a list — and this value is a string, so no edit to this file's prose
can satisfy them.

Reported ONCE as `CONSTRAINT_SHAPE_MISMATCH`, not three times. A violation
carries the whole config fragment verbatim, so three collided constraints at one
address would emit three rows with identical codes, identical addresses and
identical requirements. The collision belongs to the address.
