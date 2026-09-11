# note — 11 09 2026 — standup

<!-- expect: FAILS -->

A day-first date against `^\d{4}-\d{2}-\d{2}$`, so `FILE_NAMES__PATTERN_MISMATCH` fires at `file.date`.
The mandatory sibling `intent` travels in `requirement`, so the report says "an ISO calendar date" rather
than printing the regex — the failure this language exists to avoid.
