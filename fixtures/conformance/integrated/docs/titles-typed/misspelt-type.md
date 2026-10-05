---
type: titled-notee
description: A note.
---
<!-- expect: PASSES -->

A silent type miss under a closed spine. The misspelling selects no `types` Rule, so the typed Rule never judges the file and `Improved` goes unreported, while the first Module’s Rule leaves `type` unchecked and is satisfied. The file is governed and counted as passing: an `allowed` list does not widen governance, and a Rule judges only the files it selects. This behaviour is deliberate and frozen.

# Note

## Improved
