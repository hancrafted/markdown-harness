---
type: research
description: The provenance exemplar's opposite — every named format, malformed.
generated:
  by: human/hancrafted
  at: yesterday
sources:
  - id: okf
    resource: docs/okf/SPEC-v0.2.md
  - id: rfc
    resource: has a space in it
verified:
  - by: human:hancrafted
    at: soon
stale_after: 2026-13-45
---

FAILS on format, five times over, under the same rule that `provenance.md`
satisfies — which is what makes the pair worth having: one rule, proven to pass
AND to fail, rather than a conforming exemplar that an addresser reaching
nothing would also produce.

`generated.by` is the reserved-producer trap (`human/` where `human:` belongs),
`generated.at` and `verified[0].at` and `stale_after` are not ISO 8601 with an
offset, and `sources[1].resource` carries whitespace. That last one is also the
corpus's only PER-ENTRY violation: the report says `sources[1].resource`, not
`sources[].resource`, because a report that named the address the config wrote
would not say which entry to fix.
