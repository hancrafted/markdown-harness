# aikb — — llm wiki

<!-- expect: PASSES -->

THE CONSEQUENCE OF A DECISION, recorded so it can be disagreed with. Four underscores are two delimiters,
so the stem splits into `aikb`, an empty part, and `llm-wiki`. A part must be non-empty to count as one, so
the empty middle is dropped, the count is two, and both surviving parts satisfy their segments.

A third code for an empty part was refused deliberately: it would make this name carry two findings at once
and force a ranking between them, which is a decision this design has already closed. If PASSES is the
wrong answer here, `partsOf` in `name-stem.pure.ts` is the function to change — not this marker.
