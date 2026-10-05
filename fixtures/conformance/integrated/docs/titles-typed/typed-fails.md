---
type: titled-note
description: A note.
---
<!-- expect: FAILS -->

The `type` is `titled-note`, so the typed Rule selects the file and judges it, and `Improved` is outside its vocabulary at the second level. The first Module’s Rule leaves `type` unchecked and is satisfied, so only the second Module reports.

# Note

## Improved
