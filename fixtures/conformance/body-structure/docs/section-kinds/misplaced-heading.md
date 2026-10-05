<!-- expect: FAILS -->

The `Ordered` entry claims the later heading, which leaves `Bullets` before the cursor, so the `Bullets` entry reports it out of order. Its section is judged by nobody: the paragraph under it would break the entry’s `mayHold` and is not reported, so the Contributor moves the heading first and is told about its content on the next run.

## Bullets

A paragraph.

## Ordered

1. First.
