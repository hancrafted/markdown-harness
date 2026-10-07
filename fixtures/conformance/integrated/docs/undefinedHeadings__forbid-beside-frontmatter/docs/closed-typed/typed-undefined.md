---
type: closed-note
description: A note.
---
<!-- expect: FAILS -->

The `type` is `closed-note`, so the typed closed Rule selects the file and judges it, and `Extra` is undefined. The first Module’s Rule leaves `type` unchecked and is satisfied, so only the second Module reports.

# Note

## Extra
