<!-- expect: FAILS -->

`Consequences` gives only the good side. The nested entry for `Negative` claims nothing, so it is missing, reported with its path into the nested list and the heading it was looked for under.

# Use a queue

## Context

Requests arrive faster than they are handled.

## Options

### Option A: a queue

### Option B: more workers

## Decision

We use a queue.

## Consequences

### Positive

- Bursts are absorbed.
