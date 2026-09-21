---
type: workflow
description: A workflow that never says what it is called.
---

<!-- expect: FAILS -->

`allOf: [title, description]` needs every address it names present and non-empty, and
`title` is absent: `ALL_OF_UNSATISFIED`, with `satisfied` reported as
`["description"]` so the fix is a subtraction rather than a re-read of the config.
The `minLength` and `maxLength` on `title` report nothing — a bound on a field that
is not there has nothing to measure, and the cross-field constraint is what carries
the complaint.
