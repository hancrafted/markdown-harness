---
---

<!-- expect: FAILS -->

The fence opens and closes with nothing between it. That is not the unparseable
case: it parses, to an empty mapping, so the plain rule's `presence: required`
reports `MISSING_REQUIRED_FIELD` on `type` rather than being skipped. The trap is
that a YAML reader hands back nothing for these bytes, and a harness that reads
"nothing" as "no block" would report nothing here at all.
