---
name: feedback-decide-from-consequences
description: When asking the user to choose, lead with the concrete downstream consequence and a worked example — never with the technical trade-off
metadata:
  type: feedback
---

When you put a decision to this user, each option must carry a **worked example with real
values from this repo** and a plain statement of **what changes for them later**. Do not lead
with the architectural trade-off, and do not make them reason about second-order effects.

**Why:** A three-question decision round about scorer design was rejected outright — "the
questions were very technical without examples, 2nd order impact, so I was not able to
decide." The options named the mechanism (promote `extract()` to a root file, keep
`inventedAcrossPack`, restructure to summary+detail) and left the reader to derive what each
would cost them. They could not, so nothing got decided and a round-trip was wasted.

**How to apply:** Before calling `AskUserQuestion`, for every option answer two questions in
the option text itself. First: _show me this happening_ — a named file, a real URL, an actual
number from a run. Second: _what is different for me in a week_ — what they will read, type,
or have to remember. If an option's only difference is internal and never reaches them, it is
not a question worth asking; pick the default and say so. Applies equally in prose: the same
failure mode shows up when explaining a trade-off, not only when asking about one.

Related: [[feedback-no-invented-prose]] — both are about giving the real artifact instead of a
sentence describing it.
