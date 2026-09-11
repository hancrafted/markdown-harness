# diary — 11 09 2026 — Standup

<!-- expect: FAILS -->

THREE findings on one name. The count is right, so all three parts are judged and all three fail: `diary`
is outside the `kind` set, the date is day-first, and `Standup` is not kebab-case. The per-segment address
is what makes this actionable — `file.kind`, `file.date` and `file.slug`, each with its own repair.
