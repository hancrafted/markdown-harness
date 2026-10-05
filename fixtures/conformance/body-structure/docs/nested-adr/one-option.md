<!-- expect: FAILS -->

The second option is written under `Decision`, not under `Options`. The nested list of `Options` covers its section only, up to the next second-level heading, so it counts one option and is below its minimum; the stray option under `Decision` is no concern of an open spine.

# Use a queue

## Context

Requests arrive faster than they are handled.

## Options

### Option A: a queue

## Decision

### Option B: more workers

We use a queue.

## Consequences

### Positive

- Bursts are absorbed.

### Negative

- Latency grows under load.
