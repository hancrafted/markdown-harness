---
type: dataset
retrieved:
  by: human/hancrafted
  at: 2026-08-24
origin: s3://hancrafted-exports/quarterly usage.parquet
---

<!-- expect: FAILS -->

Three `FORMAT_MISMATCH` violations, one per named format, reported in the config's
own `fields:` order. `human/hancrafted` is the reserved-producer trap: `human` and
`process` belong to the colon form, so the slash form is a mismatch however
well-spelled it looks. `2026-08-24` is a date with no time and no offset, and `format`
is form only — nothing here consults a clock, so a real calendar date fails for want
of the rest of the grammar. `origin` holds whitespace, and `uri` is one non-empty
token with none in it.

`bad-actor.md` under `research/` is the same malformed Actor going unreported, because
the rule that won there never asked about `generated`. The pair is the whole of
first-match: a constraint that did not win does not exist.
