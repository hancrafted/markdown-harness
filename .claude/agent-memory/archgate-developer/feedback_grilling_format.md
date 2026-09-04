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

**The format is not just for grilling rounds.** On 2026-09-03, mid-session on
`prepare-ablation-run` feedback, Han cut a long prose answer with "too much text and too hard to
read. List questions with options and recommendation one by one." The answer had the right content
and the wrong shape: findings and questions braided together across many paragraphs, so the
decisions he actually had to make were buried in evidence he had not asked to re-read. Any reply
that asks him for more than one decision takes the numbered shape — question, options, arrow,
recommendation — with the evidence either above it in its own section or cut entirely.

**Recurred 2026-09-04** (ablation-runs feedback grill). Rounds 1 and 2 were dense: 40-word
sentences, findings braided into the question bodies, evidence quoted at length before the ask.
Han invoked `/wait-what` — "simpler and shorter phrases, provide examples, keep the /grilling
format". Rule 4 and rule 5 are the ones that slip when the evidence is rich. When a round carries
a lot of proof, put the proof in its own section above the questions, then write the questions
short.

**How to apply:** Any `/grill`, `/grill-with-docs`, `/grill-me`, or wayfinder round in this repo,
and any reply carrying multiple open decisions.
State a real recommendation for every question — a question without one is unfinished work.
`AskUserQuestion` stays fine for a genuine either/or outside a grilling round.
See [[orient-before-grilling]], [[name-adrs-by-id-plus-slug]] and [[han-operator-author]].
