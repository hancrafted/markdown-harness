---
type: workflow
title: [Cutting, a, release]
description: A title written as a list of words rather than a sentence.
---

<!-- expect: FAILS -->

`minLength` and `maxLength` apply to strings, and `title` here is a list, so
`CONSTRAINT_SHAPE_MISMATCH` fires — the one code addressed to the Operator rather
than to the agent editing this file, because no markdown edit fixes a constraint
pointed at the wrong shape. Reporting a length code instead would be worse than
silence: three entries satisfy `minLength: 3` by coincidence, and an agent told
`VALUE_TOO_LONG` would start deleting characters from a list.
