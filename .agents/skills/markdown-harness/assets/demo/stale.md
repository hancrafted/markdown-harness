---
title: A document that has gone stale
stale_after: 2020-01-01T00:00:00Z
---

# A document that has gone stale

This file is the point of the demo. Its `stale_after` is in the past and always will be, so every
tool that asks about it gets the same answer, on any machine, on any date.

Ask the tool directly:

```sh
mh --assess docs/markdown-harness/demo/stale.md
```

It answers `agentAction: REVIEW`, and carries back the sentence the demo rule configured — not a
sentence markdown-harness wrote. That sentence is the whole product surface.

**The part worth seeing rather than reading about.** If the Claude Code hook is wired, an agent that
opens this file in a _fresh_ session is handed that sentence alongside the file, without being asked
and without running any command. Nothing in the body below tells it to. The frontmatter did.

Note that the body of a document is free to lie about its own freshness. This paragraph could claim
the file was reviewed this morning, and the answer above would not change, because the answer comes
from `stale_after` and not from prose. That is the reason the signal lives in the frontmatter.
