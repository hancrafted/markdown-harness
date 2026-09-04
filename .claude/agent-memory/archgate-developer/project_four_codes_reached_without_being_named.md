---
name: four-codes-reached-without-being-named
description: Four of the eighteen violation codes are reached only by Conformance cases that never spell the code, so grepping the corpus for a code name under-reports coverage
metadata:
  type: project
---

`VALUE_NOT_ALLOWED`, `PATTERN_MISMATCH`, `UNKNOWN_KEY_FORBIDDEN` and
`EXACTLY_ONE_OF_MULTIPLE_PRESENT` are reached only by `reference/legacy.md` and
`skills/legacy/SKILL.md`. Both predate the convention of naming the code, so they
describe the constraint instead — "`status` outside its `allowed` records" — and
`grep -r VALUE_NOT_ALLOWED fixtures/` returns nothing.

**Why:** issue #30 put "changing an existing Conformance case" out of scope, citing
`ARCH-002` §3.2/§3.3, so the twenty cases added in Phase 0 name their codes and the
fourteen originals were left alone. The gap is deliberate, not an oversight.

**How to apply:** never audit violation-code coverage by grepping prose. It fails in
both directions — it misses these four, and it counts cases that name a code only to
say it is _not_ the right one (`research/untagged.md` names `EMPTY_REQUIRED_FIELD` to
rule it out; `research/long-tag.md` and `workflows/listed-title.md` do the same for
`VALUE_TOO_LONG`). Build the mapping by working out which rule wins under first-match
and what §4.7 says it reports. Phase 3's `conformance.test.ts` is where the binding
should land mechanically; [#16](https://github.com/hancrafted/markdown-harness/issues/16)
is the adjacent ticket. Same family as [[evaluate-arrays-never-grep-them]] — grep is
not a measurement instrument.
