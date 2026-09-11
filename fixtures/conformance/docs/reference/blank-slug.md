---
type: reference
description: A reference page with an optional slug written empty.
status: stable
slug:
---

<!-- expect: PASSES -->

`slug` is optional and carries a string `format` constraint. Written with no value,
it reports no violation: an optional field left blank is not a shape collision.

The constraint was a bare `pattern` until `kebab-case` was promoted to a named format.
The verdict is unchanged, and deliberately so — the empty string is `presence`'s business
rather than this constraint's, so a blank value never reaches the grammar at all.
