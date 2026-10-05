---
type: research
---
<!-- expect: PASSES -->

The file begins with a byte order mark, which is tolerated before the opening fence, so the block is read and its `type` selects `research-reports`. Read without that tolerance the file would have no frontmatter and no `type`, would fall through to `research-untyped`, and would fail on the second-level headings that Rule forbids.

# Report

## Findings

## Source: One
