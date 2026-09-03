---
name: grilling-format-prose-not-picker
description: How to shape a grill round in this repo — prose not the AskUserQuestion picker, max 3 questions, numbered options, ASD-STE100 sentences, concrete examples over descriptions
metadata:
  type: feedback
---

Format every grilling round as the `grilling` skill's own prose — never the `AskUserQuestion` picker.
Shape each round like this:

1. **Max 3 questions per round.** Cut or defer the rest; a fourth question belongs in the next round.
2. **Options as a numbered list**, one line each.
3. **Recommendation last**, after the options, and always with the reason attached.
4. **Simple sentences** — `/wait-what` style: ASD-STE100 Simplified Technical English, short active
   sentences, one idea each, plus the ubiquitous language from `CONTEXT.md`.
5. **Show, do not describe.** Where an option can carry a code snippet, a glob, or a frontmatter
   block, write the snippet instead of explaining the option in prose.

**Why:** Han rejected an `AskUserQuestion` round mid-session (2026-08-27) and asked for
"/grilling format ... I want a recommendation." The picker hides reasoning behind option cards and
forces one selection per question; he answers by reasoning back at the questions in free text,
sometimes partially. On 2026-09-03 (wayfinder #8) he added the rest: a 4-question round with prose
options was too much surface, and options described rather than shown cost him a mental
reconstruction he should not have to do.

**How to apply:** Any `/grill`, `/grill-with-docs`, `/grill-me`, or wayfinder round in this repo.
State a real recommendation for every question — a question without one is unfinished work.
`AskUserQuestion` stays fine for a genuine either/or outside a grilling round.
See [[orient-before-grilling]], [[name-adrs-by-id-plus-slug]] and [[han-operator-author]].
