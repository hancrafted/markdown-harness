---
name: vocabulary-over-migration-cost
description: When a better term and a cheaper migration conflict, Han takes the better term and pays the migration — quote him the site count, then recommend the name, not the diff size
metadata:
  type: feedback
---

A naming decision is settled on which word is more accurate, never on how many call sites the
rename touches. Quote the migration cost as information; do not let it carry the recommendation.

**Why:** On issue #13 (2026-08-28) his manual ADR cut renamed the three suite blocks
`happy path`/`sad path` → `success cases`/`failure cases`. I measured both directions and
recommended reverting the record — 3 sites in one file — over migrating the repo, 11 code and doc
sites plus a glossary rewrite. He took the 11: _"We keep success, failure cases and edge cases.
It's a better world than a happy and sad path."_ The cheap-diff argument did not register as an
argument. Note the ticket had specified the old names and he overrode his own spec to get the
better one, so a spec citation will not carry it either.

**How to apply:** Any renaming or vocabulary question — glossary terms in `CONTEXT.md`, ADR
prose, enforcer strings. Lead with which word is more accurate and why, list the migration sites
underneath as scope rather than as a reason. Same session, he also declined to restore a cut
Decision anchor and had me fix the stale `description` instead: he would rather leave a deliberate
choice unrecorded than buy back ADR characters. Related: [[adr-prose-compression-not-relocation]],
[[over-budget-adr-hand-over-complete]].
