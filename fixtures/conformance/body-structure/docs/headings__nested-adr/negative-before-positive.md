<!-- expect: FAILS -->

`Negative` comes before `Positive`. The nested walk claims `Positive` and moves past it, so `Negative` lies behind the cursor and is out of order.

# Use a queue

## Context

Requests arrive faster than they are handled.

## Options

### Option A: a queue

### Option B: more workers

## Decision

We use a queue.

## Consequences

### Negative

- Latency grows under load.

### Positive

- Bursts are absorbed.
