<!-- expect: FAILS -->

The first `Ordered` claims the entry and the second is a repeat, which the entry reports as repeated. The repeat’s section is judged by nobody: the paragraph under it breaks the entry’s `mayHold` and is not reported, because the heading is already behind one finding of its own, and a heading is never behind a second.

## Ordered

1. First.

## Ordered

A paragraph.
