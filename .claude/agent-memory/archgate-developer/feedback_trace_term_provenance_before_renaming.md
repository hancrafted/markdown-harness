---
name: trace-term-provenance-before-renaming
description: Han asks where a term came from before he decides whether to keep it — trace the etymology yourself; it is a fact question, never one to hand back
metadata:
  type: feedback
---

When a vocabulary decision is on the table, Han's first move is often **"where does this name come from?"** — not "should we change it". Answer it with traced provenance before proposing anything: which vendored skill or upstream source supplied the word, whether it was borrowed or coined here, and the commit that coined it (`git log -S'**Term**:' -- CONTEXT.md`). Then name the collision the term still carries, even if the glossary already lists it under _Avoid_.

**Why:** he weighs a term by what it inherits and what it is load-bearing for, not by whether it reads well. Asked about `Package`, the useful answer was that `codebase-design` defines only **Module** and uses "package" lower-case as an example of scale; the vendored `setup-ts-deep-modules` skill supplies the folder, `PACKAGES_ROOT` and the boundary rules; and the capital-P term is this repo's own. That made "keep it" obvious — renaming the term while the vendored config fixes the folder would split the word from the tree.

**How to apply:** treat the provenance question as a **fact question, yours to answer** (the grilling skill says so explicitly — never hand a lookup back to him). Search the vendored skills, the research docs, and `git log -S` on the glossary. Report the source, the coinage commit, the open collision, and the site count. Then recommend. Pairs with [[vocabulary-over-migration-cost]]: the site count is scope, never the argument.
