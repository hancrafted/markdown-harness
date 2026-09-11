---
title: 'Rules ]draft'
description: The link text holds an unbalanced closing bracket.
---

# Rules

The `title` above is the string used as link text, and it holds a `]` with no `[` before it.
Copied verbatim the entry would read `[Rules ]draft](rules.md)`, which ends the link early and
leaks the rest as prose.

The generator refuses rather than escaping. Strictness is the reversible direction: a refusal
can be relaxed later without touching an adopter's tree, while an escape shipped now becomes
bytes a later tightening would have to rewrite.
