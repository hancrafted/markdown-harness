---
type: reference
description: A reference page that shipped with its draft flag still attached.
status: draft
slug: draft-page
draft: true
---

<!-- expect: FAILS -->

`draft` carries `presence: forbidden`, so `FORBIDDEN_FIELD_PRESENT` fires and the fix
is deletion, never a corrected value. `status: draft` is a different key with a
different answer: it appears in the rule's `allowed` records and passes. A rule that
forbids a key can still allow the same word as a value elsewhere, and a report
confusing the two would send an agent to the wrong line.
