---
description: Harvested evidence, one survey per question.
---

# Research

This file is the reason the finder reads blocks rather than bytes. It holds four marker
literals in prose and a fence, plus one real pair. A byte scan finds six boundaries here.
A block scan finds two.

The fence below quotes both markers. Inside a fence they parse as a code block, so neither is
ever a boundary:

```text
<!-- indexes:start -->

- [not-an-entry](not-an-entry.md) - Quoted, never generated.

<!-- indexes:end -->
```

And this sentence mentions <!-- indexes:end --> in the middle of a line, which parses as
inline HTML rather than as a block, so it is not a boundary either.

<!-- indexes:start -->
<!-- generated, do not edit; run `mh indexes generate` to update -->

- [survey](survey.md) - A survey of eight tools, no two of which share a marker shape.

<!-- indexes:end -->
