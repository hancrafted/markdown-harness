---
type: [note
---
<!-- expect: FAILS -->

Unreadable frontmatter does not hide the body from a Rule that needs no `type`. `frontmatter` reports the block and `body-structure`'s `mixed-title` Rule, which selects by folder alone, reads the body after the closing fence and reports the repeated title.

# One

# Two
