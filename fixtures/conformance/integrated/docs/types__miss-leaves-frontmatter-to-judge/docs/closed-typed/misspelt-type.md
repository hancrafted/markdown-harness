---
type: closd-note
description: A note.
---
<!-- expect: PASSES -->

Silent type miss under a closed spine. The misspelling selects no `types` Rule, so the closed `closed-typed` Rule never judges the file and `Extra` goes unreported, while `frontmatter`’s Rule leaves `type` unchecked and is satisfied. The file is governed, counted and passes: closing a spine does not widen governance, because a closed Rule judges only the files it selects. This behaviour is deliberate and frozen.

# Note

## Extra
