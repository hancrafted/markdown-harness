---
description: A decision record.
## a YAML comment that looks like an undefined section
---
<!-- expect: PASSES -->

The comment inside the frontmatter block reads as an undefined second-level heading if the block is not split off before the body is read. The block is removed first, so the body is a title, Status and Decision and the closed spine is satisfied.

# ADR

## Status

## Decision
