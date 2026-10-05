---
description: [note
---
<!-- expect: FAILS -->

Frontmatter that does not parse does not hide the body from a closed Rule that needs no `type`. `frontmatter` reports the block, and `closed-notes`, which selects by folder alone, reads the body after the closing fence and reports `Extra` as undefined.

# Note

## Extra
