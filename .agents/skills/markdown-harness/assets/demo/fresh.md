---
title: A document that is still fresh
stale_after: 2099-01-01T00:00:00Z
---

# A document that is still fresh

This file is the control. It carries exactly what `stale.md` carries, and differs in one field: its
`stale_after` is far in the future.

```sh
mh --assess docs/markdown-harness/demo/fresh.md
```

It answers `agentAction: PROCEED`, and no instruction travels — silence is the contract here, not a
missing feature.

**Silence is why this file exists.** A hook that fired on every file would be indistinguishable from
a hook that was broken, and both would get switched off within a day. Open this file in the same
session where `stale.md` spoke, and nothing happens. That contrast is the demo: the hook is not
noisy, it is _specific_.
