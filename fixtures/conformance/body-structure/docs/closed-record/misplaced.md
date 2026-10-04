<!-- expect: FAILS -->

`Decision` and `Status` are both headings the spine names, so neither is undefined, and their order is wrong. The `Status` entry claims the last heading, which moves the cursor past `Decision`, and the `Decision` entry then finds its heading before the cursor, so it reports out of order and the closure says nothing.

# ADR

## Decision

## Status
