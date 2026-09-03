---
name: vendored-material-carries-its-origin
description: When copying a file into a different context, audit its metadata as well as its body — frontmatter written for the source context can silently disable the copy
metadata:
  type: feedback
---

When you vendor a file into a context it was not written for, review its **frontmatter and
config keys**, not only its prose. Metadata encodes assumptions about the origin that the copy
inherits silently.

**Why:** on 2026-09-03 the `prepare-ablation-run` skill vendored three authoring skills into every
run repository. The strip plan listed four sites to edit — all four in **body** text. None were in
frontmatter, and `implement/SKILL.md` carried `disable-model-invocation: true`, correct in
`markdown-harness` where only Han types `/implement`, and wrong in a run repository where the agent
is the only caller. Per `SKILL-MECHANICS.md`, that key strips the description from the agent's
reach: _"only the human typing its name can invoke it, and no other skill can."_ So the run's
`AGENTS.md` said "use `implement`" while naming a skill absent from the agent's listing — a context
pointer at an unreachable target, failing silently in every run. Han found it by inspection, not by
any check.

**How to apply:** when copying material across a context boundary, diff the metadata against what
the destination needs, and ask what each key assumed about the source. Then check the reverse
direction too: any document naming the vendored thing (`AGENTS.md`, a router skill, a pointer) is
asserting reachability, so verify the target can actually be reached from where the pointer lives.
Related: [[vacuous-green]] — an unreachable pointer and a check that never ran fail the same way,
by producing no signal at all.
