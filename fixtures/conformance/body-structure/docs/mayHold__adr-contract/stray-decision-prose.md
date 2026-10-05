---
type: adr
id: DEMO-001
title: 'Demo'
---
<!-- expect: PASSES -->

The contract has no text directly under `Decision`, only its anchors, and this Rule cannot say so: an empty `mayHold` is refused as a config fault, so the `Decision` entry writes none and its own section is unconstrained. A paragraph there passes. It is a limit of the allowed-set design, recorded rather than worked around, and a form for "holds nothing" is a later decision.

# Demo ADR

## Context

Why.

## Decision

A stray paragraph before the first anchor.

### 1. First anchor

1. A rule.

### 2. Second anchor

1. Another rule.

## Do's and Don'ts

### Do's

1. **DO** write it.

### Don'ts

1. **DON'T** skip it.

## Consequences

**Positive:**

1. Good.

**Negative:**

1. Bad.

## Compliance and Enforcement

Enforced by a rule.

## References

- [archgate](https://archgate.dev/)
