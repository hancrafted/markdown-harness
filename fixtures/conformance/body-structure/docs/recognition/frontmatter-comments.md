---
type: note
# a YAML comment that looks like a title
# another one
---
<!-- expect: PASSES -->

Lines inside the frontmatter block are never read as headings. The block is removed before the body is read, so only the real title counts.

# Title
