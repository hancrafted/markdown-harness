---
type: [research
---
<!-- expect: PASSES -->

The frontmatter block closes but does not parse, so the `type` cannot be read and selects nothing. The body after the closing fence is still read, and the folder-only Rule governs it.

# Research
