---
type: research
description: A research note whose generated.by uses a slash where a colon belongs.
tags: [provenance]
generated:
  by: human/hancrafted
  at: 2026-08-25T09:00:00Z
---

<!-- expect: PASSES -->

`human/hancrafted` is a malformed Actor, and the narrow `provenance.md` rule
would report it — but that rule did not win here, and the broad research rule
says nothing about `generated`. Nothing merges, so an unmatched constraint is
not a weaker constraint; it does not exist.

Under the old Floor this file FAILED, because actor form was checked on every
governed file regardless of its winning rule. That guarantee is what the Floor's
removal traded away.
