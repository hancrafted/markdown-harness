---
type: agent-guide
---

# Voice grilling

How to run a grilling session in this project when the user is speaking rather than typing.

Derived from the `grilling` skill, repurposed for voice. It keeps the design tree and the
frontier; it replaces the round format, and it drops the sub-agent fact-finding the original
depends on.

## When this applies

Only when the user asks for a grilling session **and** is dictating. Trigger phrases: "grill
me", "let's grill", "grill this", or an explicit request to stress-test a plan or decision out
loud.

Everything below is inert otherwise. This document sits in project Context, so it loads into
every conversation here — it must not shape ordinary chats.

If the user is typing, use the repo's own round format
(`docs/agents/grilling-format.md`) instead. This document overrides that override, and only
for voice.

## The channel constraint

The user is typically driving or commuting. They cannot read, scan back, re-read a question, or
type. Every rule here derives from that, and if the constraint does not hold, most of the rules
stop being justified.

Note what this costs. The original skill makes fact-finding the assistant's job and says to
dispatch a sub-agent rather than ask the user. In a chat session there is no filesystem, no
repo and no issue list, so facts about the tree have to come from the user — the one thing the
original forbids. Web-reachable facts are still the assistant's job: search rather than ask.
For anything in the tree, follow `AGENTS.md` — name both readings and proceed on the one the
context implies, rather than stopping to ask.

## Calibration, asked once, as one batch

Ask three questions before anything else. Always these three, in this order. They are the
deliberate exception to one-question-at-a-time: nothing is being decided, they are short, and a
fixed set becomes automatic to answer.

1. **Abstraction level** — high-level architecture, or a concrete engineering decision?
2. **Target artefact** — what is this session aimed at producing?
3. **Time available** — roughly how long?

Abstraction level is the load-bearing one. It sets question density: high-level architecture
branches indefinitely and needs fewer, wider questions; format-level decisions resolve in a
turn each and can be worked quickly. Time available decides how much of the tree to attempt.

**Do not ask what the opening prompt already answered.** If the user opened with "twenty
minutes, high level, aiming at the vision doc," read back what was inferred and ask only for
the gaps. Confirmation, not interrogation.

## One question at a time

Keep the frontier — every decision whose prerequisites are settled — as private bookkeeping.
Never read it out as a list. Five open questions cannot be held in working memory while
driving, and there is no transcript to scan back through.

Ask one question. Give a recommended answer, as the original skill requires. Then stop.

State position aloud when a decision lands, briefly: "that settles the config shape, three
still open, next is naming." That gives the orientation a numbered round would have given,
without requiring anything to be retained.

### Which question comes next

The original never needed an ordering rule — order did not matter when a whole round was
visible at once. Flattening created the gap. This rule is a proposal, not a settled decision:

1. Prefer the question that unblocks the most others. Answering it collapses the most tree.
2. Break ties toward the cheapest question at the calibrated abstraction level.
3. Defer anything needing a fact neither party has to hand, and say it is deferred.

## Advancing: "let's move on"

Nothing advances until the user says **"let's move on."**

Deliberately not "next". One syllable, and plausibly a mis-transcription of something else.
Three words will not appear by accident.

**This reason is part of the rule.** Without it the phrase gets shortened for convenience
later, and the failure it prevents returns silently.

## While a question is open

Brief acknowledgement only — "mm", "right". Nothing else.

No follow-up question. No summary. No suggestion. No moving to the next question.

In audio, thinking out loud is indistinguishable from having finished, and advancing early is
the specific observed failure this guards. Pure silence was considered and rejected: it cannot
be told apart from a dropped connection.

A read-back of what was understood is allowed when a decision appears to have landed, but it
ends by going quiet — not by asking whether to move on. Putting a question in front of the
user every turn is its own kind of noise.

_Provisional. Adopted to try, not on conviction._

## Vocabulary

`CONTEXT.md` is the glossary. Use it in one direction only.

- Silently use the defined term. Never invent a synonym.
- A single use of an avoid-list word gets no correction. It is probably just speech.
- Raise it only on **repeated** use — which may mean the glossary entry is wrong rather than
  the speaker.
- Never let vocabulary drift become its own conversation mid-session. Note genuinely new terms
  for the handoff instead.

## The handoff is the deliverable

The session is not the artefact. The user leaves voice mode, types a short prompt, and the
output is a structured prompt they paste into a Cowork or Claude Code session.

Three parts:

1. **Settled decisions, each with the reasoning that produced it.**
2. **Open questions, marked as open** — so the receiving agent does not assume they were
   decided.
3. **The concrete next action** — files to change, issues to file, whatever the session aimed
   at.

The reasoning is not optional. A decision without its "why" gets silently reversed by the next
agent that reads it, which is the drift `markdown-harness` exists to make visible.

State any premise the design rests on, so a later reader can invalidate it rather than inherit
it unknowingly.

## Ending

The original ends when the frontier is empty. Voice sessions end when the commute does, which
is usually sooner.

When time is nearly up, or the session is cut short, produce the handoff with what exists.
A partial handoff naming three settled decisions and six open questions is worth more than an
abandoned session. Never present an unfinished tree as a finished one.

Do not act on the outcome until the user confirms shared understanding has been reached.

## Known gaps

- The ordering rule above is a proposal, never tested.
- Acknowledgement-only is untested in a real commute.
- Resuming an interrupted session across two commutes is unaddressed. Current answer: produce
  the handoff early and open the next session by reading it back.
- The domain-modelling half of `grill-with-docs` is not accounted for here.
