---
type: dataset
retrieved:
  by: process:nightly-export
  at: 2026-08-24T02:15:00Z
origin: s3://hancrafted-exports/usage-events-2026-08.parquet
---

<!-- expect: PASSES -->

All three named formats satisfied on a file that is not `provenance.md`. `by` takes
the `process:<id>` arm of `actor`, `at` carries a full time and an explicit `Z`
offset, and `origin` is a single token with no whitespace in it.
