---
type:
---

FAILS, and fails DIFFERENTLY from `untyped.md`. The plain rule requires `type`;
`untyped.md` never wrote the key and this one wrote it and said nothing, which
YAML parses as null. Two mistakes, two repairs, two codes —
`MISSING_REQUIRED_FIELD` there and `EMPTY_REQUIRED_FIELD` here. This file is the
receipt for the split: collapsed into one code, the author of this file would be
told to add a key they can see is already present.
