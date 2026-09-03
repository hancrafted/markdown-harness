---
type: reference
description: A reference page that admits it is not finished.
status: draft
slug: drafty
draft: true
---

FAILS on `draft` alone. The reference rule says `presence: forbidden` there —
reference material ships finished or not at all — so the repair is DELETION,
which is why this reports `FORBIDDEN_FIELD_PRESENT` and not the code an absent
required field gets. Everything else here conforms, including `status: draft`:
the lifecycle value is allowed, and only the separate `draft` key is not.
