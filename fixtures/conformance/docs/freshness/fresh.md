---
type: note
stale_after: 2027-06-01T00:00:00Z
---

# Rate limits, still current

<!-- expect: PASSES -->
<!-- assess: PROCEED -->

The mirror of `stale.md`: same rule, same required fields, a freshness date that
has not arrived. `--check` cannot tell the two apart, because both carry a
well-formed `datetime` — which is exactly the point of pairing them.

The Assessment instant this is judged against is PINNED in the test runner, not
written here. Left to a real clock, this case would turn `REVIEW` on the day the
date above passes, and the suite would go red on a tree nobody had touched.
