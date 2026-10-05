<!-- expect: FAILS -->

A bold label ahead of a list is a paragraph and the lexer reads it as one, so `**Steps:**` is prose and is reported against a section that lists only `ordered-list`, even though a reader sees a caption. The same shape passes where the entry lists `prose` too, as the next cases show.

## Ordered

**Steps:**

1. First.
2. Second.
