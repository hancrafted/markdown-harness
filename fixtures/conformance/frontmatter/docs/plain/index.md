---
---

# Plain documents

<!-- expect: FAILS -->

The `index.md` rule is keyed on the basename, so it matches at any depth and sits
above the plain rule that also selects this path. It forbids frontmatter, and an
immediately-closed fence is still a block: `FRONTMATTER_FORBIDDEN` fires, its `value`
naming the block's top-level keys, of which there are none. An empty mapping is what
distinguishes this from `broken/index.md`, where the bytes never parsed at all.
