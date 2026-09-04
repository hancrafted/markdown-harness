---
type: plain
  title: indented under a scalar
---

# Broken blocks

<!-- expect: FAILS -->

The block will not parse, and the rule that wins here forbids frontmatter outright.
The rule's complaint — that there is a block at all — is true whether or not the
bytes are well-formed, so `FRONTMATTER_FORBIDDEN` is what fires, with its `value` key
**omitted**: the block's top-level keys cannot be extracted from bytes that never
parsed. `FRONTMATTER_UNPARSEABLE` is not additionally reported, because deletion is
the fix either way.

Read against `mangled.md` in this directory, the pair fixes the precedence in both
directions: the same broken block is reported alone under a constraining rule, and
suppressed entirely under a forbidding one.
