---
name: feedback-no-invented-prose
description: Reuse the config's own vocabulary verbatim in output rather than hand-writing prose that restates a user-authored free-text field
metadata:
  type: feedback
---

When output has to explain a rule, **paste the rule** rather than writing a sentence about it. Reuse
the config's own keys and the author's own text; do not maintain a parallel prose layer.

**Why:** reviewing the CLI prototype's violation messages, the user rejected a hand-written sentence
per constraint — _"since it's based on … a custom text field like the intent field, the user or the
agent can write anything in there so the renderer is stale on day one and that just is too much work
for a very [little] gain."_ Pasting the verbatim config fragment cost zero, could not drift, and
carried more information than the sentences did. It deleted roughly a layer of code. See commit
`39dba97`.

Note the precise scope: the objection is to prose we **derive**, not to prose we **quote**. Quoting a
free-text field verbatim cannot go stale, because a passthrough has nothing to drift from.

**How to apply:** in any reporting, steering or error surface. Prefer the config's own key names in
payloads so the vocabulary is self-explanatory to an agent. Before adding a `message`, a description
table, or a per-case sentence, check whether the source fragment could simply travel instead. Related
standing preferences: JSON is the structured output and YAML is the human rendering, but both must
serialise the same object; extensibility keys belong in a format from the start rather than retrofitted.
