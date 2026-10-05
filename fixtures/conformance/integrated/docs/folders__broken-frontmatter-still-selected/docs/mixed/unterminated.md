---
type: note
<!-- expect: FAILS -->

An opening fence that never closes makes the whole file one block. `frontmatter` reports it, and `body-structure` sees an empty body, so its title entry is reported missing. Both Modules read the same split.

# Looks like a title but sits inside the block
