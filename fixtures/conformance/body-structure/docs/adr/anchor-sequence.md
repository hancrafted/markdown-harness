---
type: adr
id: DEMO-001
title: 'Demo'
---
<!-- expect: PASSES -->

GEN-001 numbers its anchors from 1 in sequence and this Rule does not: the enumeration’s pattern is `^[0-9]+\. `, so anchors numbered 1, 3 and 7 pass. Sequence is a property of the values of headings, which a pattern cannot count.

# Demo ADR

## Context

Why.

## Decision

### 1. First anchor

1. A rule.

### 3. Third anchor

1. A rule.

### 7. Seventh anchor

1. A rule.

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
