---
name: feedback-reviewer-no-subagent-tool
description: A subagent cannot spawn subagents, so archgate:reviewer's per-domain fan-out is unavailable when you ARE the subagent — run the domain checks inline; a top-level agent should still fan out
metadata:
  type: feedback
---

`archgate:reviewer` tells you to launch one sub-agent per affected domain. Whether you can
depends on where you are running, and the two cases have opposite answers:

- **Top-level agent** — the Agent tool is present. Fan out as the skill describes.
- **Inside a subagent** — no Agent tool is in the toolset, so the fan-out is impossible.
  Confirmed 2026-08-28 by two independent worktree agents on #10 and #11.

**Why:** a subagent cannot spawn subagents in this configuration. Both agents wrote this up
as _"no Agent tool exists in this harness"_, which is wrong — the harness that spawned them
used exactly that tool. Left uncorrected, the note would talk a top-level agent out of a
fan-out it is perfectly able to do.

**How to apply:** do not test for the tool and conclude something about "this harness". Ask
where you are. As a subagent, run `archgate review-context --run-checks`, do the per-domain
Do's/Don'ts pass inline, emit the skill's usual `## Reviewer: APPROVED | BLOCKED` aggregate,
and say in the report that dispatch was unavailable so the gap stays visible. As a top-level
agent, dispatch normally.

Same root error as the `verify` trap now recorded under `## Verification` in `AGENTS.md`:
a conclusion drawn about the environment from inside an isolated worktree does not
generalise to the real root.
