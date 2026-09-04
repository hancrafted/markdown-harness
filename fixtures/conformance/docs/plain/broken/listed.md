---
- type: plain
- title: A block that is a list
---

<!-- expect: FAILS -->

These bytes are valid YAML and parse to a sequence, not a mapping. That is the second
`FRONTMATTER_UNPARSEABLE` edge, and it shares the first one's code because it shares
the first one's fix and the first one's danger: there is no top-level key to read
from either. A parse that succeeds is not a parse that produced frontmatter.
