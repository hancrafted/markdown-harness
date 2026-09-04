---
type: research
description: A note that records neither where it came from nor who made it.
tags: [unsourced]
---

<!-- expect: FAILS -->

The research rule's `anyOf: [sources, generated]` wants at least one arm present and
non-empty, and this file has neither: `ANY_OF_UNSATISFIED`, with `satisfied` reported
as the empty set. Its neighbour `survey.md` is the same rule passing on its other
arm, which is what makes `anyOf` a real choice rather than a disguised requirement.
