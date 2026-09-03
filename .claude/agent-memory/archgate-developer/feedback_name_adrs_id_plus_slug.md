---
name: name-adrs-by-id-plus-slug
description: Never refer to an ADR by its bare id — always write the id plus its full slug, e.g. ARCH-004-folders-and-files
metadata:
  type: feedback
---

Write every ADR reference as **id plus full slug**: `ARCH-004-folders-and-files`, not `ARCH-004`.
This holds in prose, tables, grill rounds, resolution comments and map edits.

**Why:** Han asked for this on 2026-09-03 while grilling wayfinder ticket #8. A wall of bare ids
(`ARCH-004`, `ARCH-005`, `ARCH-006`) is illegible — the reader must hold a lookup table in their
head to know which record is which. The slug carries the subject, so the reference reads at a
glance. This is the same rule the `wayfinder` skill states for tickets ("refer by name, never by
bare id"), applied to records.

**How to apply:** Everywhere a human reads the reference. The bare id still belongs where a machine
reads it — an ADR's `id:` frontmatter field, a rule's provenance tag `(<ID> [<rule-key>])`, and the
`GEN-001-adr` ban on one ADR citing another ADR's id all stay exactly as they are.
See [[grilling-format-prose-not-picker]].
