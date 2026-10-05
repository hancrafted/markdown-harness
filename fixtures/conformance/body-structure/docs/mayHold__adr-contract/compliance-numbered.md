---
type: adr
id: DEMO-001
title: 'Demo'
---
<!-- expect: PASSES -->

This is `passes-condensed.md` with one change: the compliance section holds an ordered list as well as its prose. The contract states what each section may hold and not what one file happens to use, and a numbered list of enforcers is a reasonable thing for a compliance section to carry, so the `Compliance and Enforcement` entry lists `prose` and `ordered-list`. GEN-001's own compliance section is prose only and still passes, and a bulleted list there would not.

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

1. A rule per Discipline.
2. A review for the rest.

## References

- [archgate](https://archgate.dev/)
