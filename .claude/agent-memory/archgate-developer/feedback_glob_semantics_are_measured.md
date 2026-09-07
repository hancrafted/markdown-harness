---
name: glob-semantics-are-measured
description: Node's matchesGlob is case-insensitive per SEGMENT when that segment holds a wildcard and case-sensitive when it is a pure literal, so `*.md` matches README.MD while `index.md` misses INDEX.MD — probe a matcher before designing against it
metadata:
  type: feedback
---

Never reason about what a glob matches. Run it. `node:path`'s `matchesGlob` does not
behave the way the pattern's spelling implies, and the divergence is per-segment.

**Why:** on 2026-09-07, building the `--audit` walker for #32, four probes produced a
rule I would not have guessed and could not have derived from the docs:

- A segment whose pattern holds a **wildcard** matches **case-insensitively**.
- A segment that is a **pure literal** matches **case-sensitively**.

So, measured on Node v26.5.0 / darwin:

| path        | glob           | result    |
| ----------- | -------------- | --------- |
| `README.MD` | `**/*.md`      | **true**  |
| `INDEX.MD`  | `**/index.md`  | **false** |
| `docs/X.MD` | `docs/**/*.md` | **true**  |
| `DOCS/x.md` | `docs/**/*.md` | **false** |
| `A/B.md`    | `*/*.md`       | **true**  |
| `A/B.md`    | `a/*.md`       | **false** |

The same session produced two more facts worth keeping, both load-bearing:

- **`node_modules/x.md` DOES match `**/*.md`.** Nothing in a rule list would have
  removed it, so the walker's explicit refusal is the only thing standing between an
  adopter and every dependency they ever installed. By contrast `.git/x.md` does **not**
  match, because `*` refuses a leading dot — that refusal is covered twice over. When a
  guarantee looks redundant, check which half is actually doing the work.
- **macOS APFS is case-insensitive by default**, so `A.md` and `A.MD` are one file. A
  case-sensitivity decision therefore **cannot be demonstrated with a planted fixture**
  on this machine — `printf > A.MD` silently overwrites `A.md`. Only a unit test over the
  predicate can show it. Check the filesystem before designing a fixture that turns on case.

**How to apply:** before writing any predicate that mirrors a glob, or asserting that
some path is or is not selected, run the matcher in `node -e` over the real cases
including the ugly ones. Where a hand-written predicate stands in for a glob, decide
deliberately whether to mirror the platform's quirk or diverge from it, and say which in
the file — I chose case-**sensitive** `.md` for the corpus so its definition would not
disagree with itself depending on how a glob was spelled, and wrote the reason where the
next reader will hit it. This quirk reaches rule matching too, not just the walker, so it
is a live concern for `--check`. Related: [[vacuous-green]] and
[[enforcer-can-read-the-source]].
