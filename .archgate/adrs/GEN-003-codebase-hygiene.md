---
type: adr
id: GEN-003
title: 'Codebase Hygiene'
domain: general
rules: true
files: ['src/**/*']
paths: ['src/**/*']
description: 'Repo-wide hygiene Disciplines binding every file under src/ whatever its language: the admission test for what belongs in the collection, and the ban on inline lint suppression.'
---

# Codebase Hygiene

## Context

This record is a **collection**: the home for hygiene Disciplines that bind every file under `src/` whatever its language, and that belong to no one subsystem.

## Decision

### 1. No inline eslint suppression (📜 Rule: `no-eslint-disable`)

1. A file under `src/` MUST NOT carry an eslint directive comment — `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, or the paired `eslint-enable` — in either the `//` or the `/* */` form.

## Do's and Don'ts

### Do's

1. **DO** turn a wrong lint rule off in `eslint.config.mjs`, behind a `files:` glob and carrying its reason. (Decision 1)

### Don'ts

1. **DON'T** write an eslint directive comment in any form under `src/`. (Decision 1, 📜 Rule: `no-eslint-disable`)

## Consequences

**Positive:**

1. **Centralized and auditable lint governance:** eliminates silent inline suppressions textually across all src/ files, consolidates exceptions into eslint.config.mjs, and provides an easily extensible structure for future hygiene disciplines.

**Negative:**

1. **Zero local escape hatches:** comment false-positives and irreducible one-off suppressions cannot be bypassed inline, pushing all exceptions into broader eslint.config.mjs globs or ADR amendments.

## Compliance and Enforcement

**Enforcer:** `GEN-003-codebase-hygiene.rules.ts`, `error` tier, scoped by `files:` to `src/**/*`. eslint declares no `linterOptions`, so it honours every directive it is handed — the gap this rule closes.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [ESLint — configuration comments](https://eslint.org/docs/latest/use/configure/rules#using-configuration-comments) — the directive forms §1 bans.
