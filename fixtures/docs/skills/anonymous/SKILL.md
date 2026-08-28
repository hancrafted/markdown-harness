---
type: skill
description: A skill that never says what it is called.
---

FAILS `exactlyOneOf: [name, title]` from the direction `legacy/SKILL.md` does
not. That file satisfies BOTH arms and this one satisfies NEITHER, and the two
want opposite repairs — remove one, add one. Both used to report the same
`exactlyOneOf`, leaving the direction to be worked out by counting the satisfied
set; now the code says it.
