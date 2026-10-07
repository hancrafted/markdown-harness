<!-- expect: FAILS -->

There is no `Options` heading, so the entry is missing and its nested list is never walked: it is checked once per heading its parent matches, and here the parent matches none. The two option headings under `Context` are not counted anywhere.

# Use a queue

## Context

Requests arrive faster than they are handled.

### Option A: a queue

### Option B: more workers

## Decision

We use a queue.

## Consequences

### Positive

- Bursts are absorbed.

### Negative

- Latency grows under load.
