---
type: reference
description: Three violations in one file.
status: retired
slug: Legacy_Reference
reviewedBy: nobody
---

<!-- expect: FAILS -->

Three violations: `status` outside its `allowed` records, `slug` against
`format: kebab-case`, and `reviewedBy` under `unknownKeys: forbidden`.

The slug finding reports `FORMAT_MISMATCH` where it once reported `PATTERN_MISMATCH`,
because the regex that used to sit here was promoted to a named format. The verdict and
the count are unchanged; only the code and the requirement fragment differ.
