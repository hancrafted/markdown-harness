---
type: sealed
---
<!-- expect: FAILS -->

The first Module forbids any frontmatter in this folder and the second selects on a `type` that only frontmatter can carry. A file with a block fails the first Module, and, because the block gives it a `type`, is governed and judged by the second as well. Both report.

# One

# Two
