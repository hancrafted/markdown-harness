---
name: grilling-format-prose-not-picker
description: In grill sessions, format rounds as the grilling skill's numbered ❓/➡️ prose, never the AskUserQuestion picker
metadata:
  type: feedback
---

When running a grilling round, use the `grilling` skill's own format — `❓ **Q1** - **title**: body`
followed by `➡️ <recommendation>`, in prose — and let the user answer by number in free text. Do not
use the `AskUserQuestion` tool for grilling rounds.

**Why:** Han rejected an `AskUserQuestion` round mid-session (2026-08-27) and asked for "/grilling
format for this first one round. I want a recommendation." The picker hides the reasoning behind
option cards and forces one selection per question; he answers by reasoning back at several
questions at once, sometimes partially ("Q3: I don't understand, give me an example") or with an
addition ("Q4: a, + also settle X"). The prose format carries the evidence and the stated
recommendation where he can attack either.

**How to apply:** Any `/grill`, `/grill-with-docs`, or `/grill-me` round in this repo. State a real
recommendation for every question — a question without one is unfinished work. `AskUserQuestion`
stays fine for a genuine either/or outside a grilling round.
