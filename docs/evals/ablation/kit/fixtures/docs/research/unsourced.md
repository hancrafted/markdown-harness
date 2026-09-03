---
type: research
description: Research that says where nothing came from.
---

FAILS `anyOf: [sources, generated]`. Neither arm is satisfied, so the satisfied
set is empty and the repair is to add one — `ANY_OF_UNSATISFIED`. Contrast
`exactlyOneOf`, which fails from BOTH directions and therefore carries two codes;
`anyOf` can only ever fail this one way, so one code is the whole of it.
