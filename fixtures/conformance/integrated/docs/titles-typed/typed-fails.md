---
type: titled-note
description: A note.
---
<!-- expect: FAILS -->

The `type` is `titled-note`, so the typed Rule selects the file and judges it, and `Improved` is no title its enumeration allows, so under its closed spine the heading is undefined. The first Module’s Rule leaves `type` unchecked and is satisfied, so only the second Module reports.

# Note

## Improved
