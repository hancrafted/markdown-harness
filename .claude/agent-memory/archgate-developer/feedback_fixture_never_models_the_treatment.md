---
name: feedback-fixture-never-models-the-treatment
description: A fixture copied into every ablation arm must not demonstrate the conventions the ablation measures — and when a frozen normative artifact and a subordinate fixture disagree, the fixture is what moves
metadata:
  type: feedback
---

Two rules for anything the ablation stamps into an arm's repo.

## 1. A fixture must not demonstrate what the experiment measures

Before shipping any file all arms read and none may edit, ask: **does this file display an
artifact one of the records under test asks an agent to produce?** If yes, strip it — even when the
display is idiomatic, even when a lint rule wants it there.

**Why:** the acceptance suite was about to ship as `tests/acceptance/*.test.ts` with
`// ARRANGE`/`// ACT`/`// ASSERT` bodies and the `success cases`/`failure cases`/`edge cases` split,
because `ARCH-003-testing` scopes itself to `**/*.test.ts` repo-wide and mandates both. Three of
that record's four Disciplines are exactly what the bare arm is supposed to be observed _not_
adopting. A marked-up suite would have handed all nine arms the convention and made ARCH-003
unscoreable — a tenth of the differential. Han's ruling: name the files `*.acceptance.ts`, keep
them outside the glob, and let the stamp script rename them on copy. Issue #21 already applies the
same principle twice, to `src/packages/AGENTS.md` and to `tdd/SKILL.md`'s ADR clause.

The same sweep caught two lifted fixture headers naming `../src/packages/contract/config.ts` as a
"shape reference" and `src/cli.test.ts` as a planter — a direct handover of interior layout and
testing shape.

**How to apply:** run the leak sweep over the _kit_, not just the spec. The spec's noun-sweep does
not cover material lifted from a branch that predates the records. Distinguish two things that look
alike: **payload** (an `intent:` string, a fixture's frontmatter) is frozen because verdicts are
pinned to it and it prescribes nothing; **prose** (comments, headers, prescriptive references) is
free to rewrite and is where leaks live. Re-verify the frozen verdict after every edit.

Watch the second-order version: a lint block vendored into the arms must keep its narrow glob. Widen
`src/**/*.test.ts` to `**/*.test.ts` and the renamed suite fails `eslint .` in six of nine runs on a
file the agent may not edit.

## 2. When the frozen artifact and the fixture disagree, the fixture moves

**Why:** `implementation-spec.md` §5 pins `"value": "ci"` for a command line naming the fixture, and
the fixture carried `title: Go`. Changing the fixture cost one word and no verdict; changing the
spec would have re-pinned the SHA in two tickets and re-run the noun-sweep. Han: option 1, the kit
moves.

**How to apply:** the spec is normative and the kit subordinate, so default to editing the kit.
Reserve re-freezing the spec for a disagreement that touches a **contract** rather than an
illustration. Either way, say which one you moved and re-verify.

See [[feedback_enforcer_can_read_the_source]] for the probe discipline these edits rely on, and
[[feedback_spec_holds_behaviour_not_setup]] for where run-environment facts belong instead.
