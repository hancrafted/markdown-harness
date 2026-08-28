---
name: feedback-reviewer-no-subagent-tool
description: archgate:reviewer's per-domain haiku sub-agent dispatch may not be available in this harness environment — do the domain review in-context instead of blocking
metadata:
  type: feedback
---

The `archgate:reviewer` skill's documented workflow launches one haiku sub-agent per affected
domain via a generic Agent/Task tool. In at least one worktree-agent environment (this repo,
2026-08-28) no such tool was present in the toolset (checked via `ToolSearch` for
"Agent Task launch subagent" — only `SendMessage`/`EnterWorktree`/tokensave tools came back).

**Why:** the skill's sub-agent step exists for context isolation on a large diff, not because the
review logic itself requires a separate process. When I have already authored every changed file
in the current turn, I already have the full context the sub-agent would have re-derived from
`archgate review-context`'s briefings.

**How to apply:** if `archgate:reviewer` is invoked and no subagent-dispatch tool is available,
don't block or skip the review — run `archgate review-context --run-checks` yourself, then do the
per-domain Do's/Don'ts check directly in the current context, and report using the skill's same
`## Reviewer: APPROVED | BLOCKED` aggregate format so the output stays consistent for whoever
reads it. Note in the report that sub-agent dispatch wasn't available, so the gap is visible
rather than silently papered over.
