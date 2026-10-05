<!-- expect: FAILS -->

A nested entry's `mayHold` is judged on the section its heading opens, exactly as a top-level entry's is. `Positive` holds a paragraph where only a bulleted list is allowed, reported under `Consequences`.

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

Bursts are absorbed.

### Negative

- Latency grows under load.
