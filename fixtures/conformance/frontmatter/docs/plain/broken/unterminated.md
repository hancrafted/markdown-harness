---
type: plain
title: The fence that never closes

<!-- expect: FAILS -->

The opening fence is never matched by a closing one, so there is no point at which
the frontmatter ends and no block to hand a parser. The spec folds this into the
first `FRONTMATTER_UNPARSEABLE` edge — "including a fence that never closes" — rather
than letting it read as a file with no frontmatter, because a file that opened a
block and lost it is a broken block, not an absent one. Under the constraining plain
rule the code is reported alone, and `presence: required` on `type` is skipped.
