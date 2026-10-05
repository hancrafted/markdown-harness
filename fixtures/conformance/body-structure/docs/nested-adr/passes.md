<!-- expect: PASSES -->

A decision record whose `Options` section holds two options and whose `Consequences` section holds `Positive` then `Negative`, each a bulleted list. Each sub-template is judged over the headings under its own heading only.

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

### Negative

- Latency grows under load.
