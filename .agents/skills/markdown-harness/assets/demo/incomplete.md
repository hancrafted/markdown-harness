---
title: A document that cannot answer the question
---

# A document that cannot answer the question

This file declares a `title` and no `stale_after`, so it is governed by the demo rule and fails it.

```sh
mh --check
```

`--check` reports the violation and exits **1** — the corpus is wrong. This is the exit code that
should fail a build, and running the gate the init workflow wired is how you see it happen for real.

```sh
mh --assess docs/markdown-harness/demo/incomplete.md
```

`--assess` answers `agentAction: FIX_FILE`: the file cannot say how much of itself to believe, which
is a repair its author owes rather than a judgement about its content.

**The hook stays silent on this file, deliberately.** A missing `stale_after` is reported once by
`--check` in the gate. If the hook reported it too, it would fire on every read of every governed
file in a corpus that has not adopted `stale_after` yet — and a governance tool that talks that much
gets switched off. Silence here is the same design that makes `stale.md` worth listening to.

Delete this file's demo folder and the marked block in the config when you are done, and the
repository is exactly as it was.
