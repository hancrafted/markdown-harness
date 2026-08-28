---
type: research
description: An index that carries frontmatter.
---

<!-- expect: FAILS -->

The `index.md` rule sits above the research rule and wins on first match,
and it forbids frontmatter. Proves ordering and the payload exclusivity in the
same file — `frontmatter: forbidden` can carry no `fields`, so a rule cannot both
forbid frontmatter and require a key in it.
