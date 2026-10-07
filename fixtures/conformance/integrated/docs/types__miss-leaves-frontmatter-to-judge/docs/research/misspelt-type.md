---
type: reserch
description: A report.
---
<!-- expect: FAILS -->

Silent type miss, wrong value. A misspelt `type` selects no `types` Rule, so the body, which has no Findings heading, is never judged. Only the first Module's `allowed` list reports the misspelling, and the file's own defect stays unreported until the type is repaired. This behaviour is deliberate and frozen.

# Report
