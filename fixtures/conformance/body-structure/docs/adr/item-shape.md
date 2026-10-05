---
type: adr
id: DEMO-001
title: 'Demo'
---
<!-- expect: PASSES -->

What is inside a list item is not governed: GEN-001 asks for a bold `**DO**` or `**DON’T**` opening on every item and this Rule does not, because item shape is a different feature and is not built. The list is a numbered list, which is all `mayHold` can see, so a do block whose items open with plain text passes. When item shape is designed, this case changes on purpose.

# Demo ADR

## Context

Why.

## Decision

### 1. First anchor

1. A rule.

### 2. Second anchor

1. Another rule.

## Do's and Don'ts

### Do's

1. Write it.
2. Check it.

### Don'ts

1. Skip it.

## Consequences

**Positive:**

1. Good.

**Negative:**

1. Bad.

## Compliance and Enforcement

Enforced by a rule.

## References

- [archgate](https://archgate.dev/)
