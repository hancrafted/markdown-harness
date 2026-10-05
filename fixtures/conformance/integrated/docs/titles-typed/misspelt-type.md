---
type: titled-notee
description: A note.
---
<!-- expect: PASSES -->

Silent type miss under a vocabulary. The misspelling selects no `types` Rule, so the typed Rule never judges the file and `Improved` goes unreported, while the first Module’s Rule leaves `type` unchecked and is satisfied. The file is governed, counted and passes: a vocabulary does not widen governance, because a Rule judges only the files it selects. This behaviour is deliberate and frozen.

# Note

## Improved
