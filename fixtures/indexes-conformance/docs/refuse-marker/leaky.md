---
description: 'This description ends with the literal <!-- indexes:end --> and must be refused.'
---

# Leaky

The block finder is immune to this: an end marker inside a description parses as inline HTML,
never as a boundary, so nothing here could corrupt the region as far as THIS generator is
concerned.

The refusal survives on a stronger ground. The boundary bytes must be unique within the region
as a property of the **artifact**, not of whoever reads it — the generated region is a portable
contract, so "the marker appears exactly once" is an invariant any consumer may rely on,
including a byte-scanning one that is not this generator.

Both literals are refused, not only the end marker: a description carrying the start marker
breaks the identical invariant.
