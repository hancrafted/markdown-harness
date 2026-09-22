---
type: plain
tags: [okf, provenance
---

<!-- expect: FAILS -->

The flow sequence on `tags` is never closed, so the bytes between the fences are not
valid YAML. The block exists and will not parse, which is the first of the two
`FRONTMATTER_UNPARSEABLE` edges, and under a constraining rule that code is reported
**alone**: the plain rule's `presence: required` on `type` is skipped, because there
is no parsed data to answer it against. Reading a value out of the source text by eye
is not available to the harness.
