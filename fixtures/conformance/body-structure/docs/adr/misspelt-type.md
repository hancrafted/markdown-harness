---
type: adrr
id: DEMO-001
title: 'Demo'
---
<!-- expect: UNGOVERNED -->

The Rule needs `type: adr` and the file says `adrr`, so no Rule selects it and the context’s numbered list, which a governed file would be reported for, is never reported. This is the silent type miss that design-ADR 0021 freezes, on a document the shape of GEN-001.

# Demo ADR

## Context

Why.

1. A list where prose belongs.

## Decision

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
