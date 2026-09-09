---
type: note
stale_after: 2026-11-24T00:00:00Z
---

# Rate limits, as of last autumn

<!-- expect: PASSES -->
<!-- assess: REVIEW -->

This document is CONFORMANT and STALE at once, which is the whole reason it is
here. `--check` reads the form of `stale_after` and finds it well-formed, so the
file passes; `--assess` compares the same value against the suite's pinned
Assessment instant and finds it in the past, so the answer is `REVIEW` and
carries the Operator's sentence from the `freshness` rule.

Nothing about this file is broken. A corpus can be entirely valid and entirely
out of date, and a tool that reported those as one thing would be no use for
either.
