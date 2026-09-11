---
type: research
title: A provenance record whose source id will not match its pattern
description: The sibling of provenance.md that proves the relocated pattern can fail.
tags: [okf, provenance]
generated:
  by: claude-opus/5
  at: 2026-08-25T09:00:00Z
sources:
  - id: Spec-One
    title: OKF, pinned revision
    resource: docs/okf/SPEC-v0.2.md
    last_modified: 2026-08-21T00:00:00Z
stale_after: 2027-01-01T00:00:00Z
---

<!-- expect: FAILS -->

THE CASE THE RELOCATED `pattern` NEEDED, and the suite lost a code without it.

`kebab-case` was promoted to a named format, which took the only `pattern` in the config off
`reference.slug`. It landed on `sources[].id` — but every real source id in `provenance.md`
already satisfies it, so `PATTERN_MISMATCH` became unreachable across the whole corpus while
every test stayed green. Measured: 19 frontmatter codes reached before the promotion, 18
after.

`Spec-One` breaks the pattern two ways at once — a capital in first position and a hyphen —
and the violation reports the Operator's sentence, never the regex.

This file sits in `provenance-exemplar`'s selector beside `provenance.md`, so the rule still
selects exact paths rather than a glob, and still sits above the broad `research` rule that
would otherwise claim both.
